import { type Locator, type Page } from '@playwright/test'
import { expectToast, toasts, uniqueTitle } from '../fixtures/panel'
import { expect, test } from '../fixtures/test'

/**
 * Interactions the other specs reach by keyboard or not at all: dragging with the mouse
 * (kanban, calendar, tree, builder, column manager, table rows), an expired page with and
 * without unsaved changes, a background request that takes too long, widget filters and a
 * failing internal request.
 */

async function open(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await expect(page.locator('[data-slot="content"]').first()).toBeVisible()
  await page.waitForLoadState('networkidle')
}

type Edge = 'top' | 'center' | 'bottom'

/**
 * A drag with the real mouse: press on the source, move in steps (HTML5 drag-and-drop and
 * pointer-driven drags both need the moves in between) and release on the target.
 */
async function drag(page: Page, source: Locator, target: Locator, edge: Edge = 'center') {
  await source.scrollIntoViewIfNeeded()

  const from = await source.boundingBox()

  if (!from) throw new Error('the drag source is not on screen')

  const startX = from.x + Math.min(from.width / 2, 24)
  const startY = from.y + from.height / 2

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 6, startY + 6, { steps: 4 })

  const to = await target.boundingBox()

  if (!to) throw new Error('the drop target is not on screen')

  const endX = to.x + Math.min(to.width / 2, 60)
  const endY =
    edge === 'top' ? to.y + 4 : edge === 'bottom' ? to.y + to.height - 4 : to.y + to.height / 2

  await page.mouse.move(endX, endY, { steps: 16 })
  await page.mouse.move(endX, endY + (edge === 'top' ? 1 : -1), { steps: 2 })
  await page.waitForTimeout(150)
  await page.mouse.up()
}

const dialog = (page: Page) => page.getByRole('dialog').last()

// ---------------------------------------------------------------- mouse drag and drop

test.describe('dragging with the mouse', () => {
  test('kanban: a card dragged to another column stays there', async ({ page }) => {
    await open(page, '/admin/posts/board')

    const column = (name: string) => page.getByRole('list', { name, exact: true })
    const card = column('Draft').getByRole('listitem').first()
    const title = ((await card.innerText()).split('\n')[0] ?? '').trim()

    expect(title).not.toBe('')

    await drag(page, card, column('In review'))
    await expect(column('In review').getByRole('button', { name: title }).first()).toBeVisible()

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(column('In review').getByRole('button', { name: title }).first()).toBeVisible()

    // Back where it was.
    const moved = column('In review').getByRole('listitem').filter({ hasText: title }).first()

    await drag(page, moved, column('Draft'))
    await expect(column('Draft').getByRole('button', { name: title }).first()).toBeVisible()
  })

  test('calendar: an event dragged to another day keeps its new date', async ({ page }) => {
    const title = uniqueTitle('E2E drag')
    const pad = (value: number) => String(value).padStart(2, '0')
    const iso = (date: Date) =>
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    const now = new Date()
    // Two days of the same week row, away from the month's edges.
    const first = new Date(now.getFullYear(), now.getMonth(), 15)
    const from = new Date(first)

    from.setDate(15 - ((first.getDay() + 6) % 7) + 1)

    const to = new Date(from)

    to.setDate(from.getDate() + 2)

    await open(page, '/admin/calendar')
    await page.getByRole('button', { name: 'New calendar event', exact: true }).click()
    await dialog(page).getByRole('textbox', { name: 'Title' }).fill(title)
    await dialog(page)
      .getByRole('textbox', { name: 'Starts at' })
      .fill(`${iso(from)}T10:00`)
    await dialog(page)
      .getByRole('textbox', { name: 'Ends at' })
      .fill(`${iso(from)}T11:00`)
    await dialog(page).getByRole('button', { name: 'Create', exact: true }).click()
    await expectToast(page, /created/i)

    const cell = (date: Date) => page.locator(`td[data-date="${iso(date)}"]`).first()
    const event = (date: Date) => cell(date).getByText(title).first()

    try {
      await expect(event(from)).toBeVisible()

      await drag(page, event(from), cell(to))
      await expect(event(to)).toBeVisible()

      await page.reload()
      await page.waitForLoadState('networkidle')
      await expect(event(to)).toBeVisible()
      await expect(event(from)).toHaveCount(0)
    } finally {
      const shown = page.getByRole('region', { name: 'Events and publications' }).getByText(title)

      await shown.first().click()
      await dialog(page)
        .getByRole('button', { name: /delete/i })
        .first()
        .click()
      await dialog(page)
        .getByRole('button', { name: /delete|confirm/i })
        .last()
        .click()
      await expect(shown).toHaveCount(0)
    }
  })

  test('tree: a node dragged past its sibling is saved in the new order', async ({ page }) => {
    await open(page, '/admin/categories/tree')

    const tree = page.getByRole('tree', { name: 'Tree' })
    const item = (name: string) =>
      tree.locator('[data-slot="tree-item"]').filter({ hasText: name }).first()
    const up = tree.getByRole('button', { name: 'Move Backend up', exact: true })
    const down = tree.getByRole('button', { name: 'Move Backend down', exact: true })
    const save = page.getByRole('button', { name: 'Save order', exact: true })

    await expect(up).toBeVisible()

    // Backend is the first or the last of its siblings: find the sibling to pass.
    const wasFirst = await down.isEnabled()
    const keys = await tree.locator('[data-slot="tree-item"]').evaluateAll((nodes) =>
      nodes.map((node) => ({
        key: node.getAttribute('data-key') ?? '',
        label: node.getAttribute('aria-label') ?? '',
        level: node.getAttribute('aria-level') ?? '',
      })),
    )
    const backend = keys.find((node) => node.label.includes('Backend'))
    const siblings = keys.filter(
      (node) => node.level === backend?.level && node.key !== backend?.key,
    )
    const index = keys.findIndex((node) => node.key === backend?.key)
    const sibling = wasFirst
      ? siblings.find((node) => keys.findIndex((other) => other.key === node.key) > index)
      : [...siblings]
          .reverse()
          .find((node) => keys.findIndex((other) => other.key === node.key) < index)

    expect(sibling).toBeTruthy()

    const target = tree.locator(`[data-slot="tree-item"][data-key="${sibling?.key}"]`)

    await drag(page, item('Backend'), target, wasFirst ? 'bottom' : 'top')
    await expect(wasFirst ? down : up).toBeDisabled()
    await save.click()
    await expectToast(page, 'Order saved')

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(wasFirst ? down : up).toBeDisabled()

    // Back, with the mouse as well.
    await drag(page, item('Backend'), target, wasFirst ? 'top' : 'bottom')
    await expect(wasFirst ? up : down).toBeDisabled()
    await save.click()
    await expectToast(page, 'Order saved')
  })

  test('builder: a block dragged above another changes the order that is submitted', async ({
    page,
  }) => {
    await open(page, '/admin/showcase/fields')

    const blocks = page.locator('ul > li[draggable="true"]')

    await expect(blocks).toHaveCount(2)

    const texts = async () =>
      blocks.evaluateAll((nodes) =>
        nodes.map((node) =>
          Array.from(node.querySelectorAll('input, textarea'))
            .map((input) => (input as HTMLInputElement).value)
            .join('|'),
        ),
      )
    const before = await texts()

    await drag(page, blocks.nth(1), blocks.nth(0), 'top')
    await expect.poll(texts).toEqual([before[1], before[0]])

    // And back.
    await drag(page, blocks.nth(1), blocks.nth(0), 'top')
    await expect.poll(texts).toEqual(before)
  })

  test('column manager: a column dragged in the list moves in the table and stays', async ({
    page,
  }) => {
    await open(page, '/admin/showcase/table')

    const headers = async () =>
      (await page.getByRole('columnheader').allInnerTexts())
        .map((text) => text.trim())
        .filter(Boolean)
    const before = await headers()

    await page.getByRole('button', { name: 'Columns', exact: true }).click()

    const entries = page.locator(
      '[data-slot="column-manager-item"], [data-slot="column-manager"] li',
    )

    await expect(entries.first()).toBeVisible()

    const count = await entries.count()

    expect(count).toBeGreaterThan(2)

    try {
      await drag(page, entries.nth(1), entries.nth(0), 'top')
      await expect.poll(headers, { timeout: 10_000 }).not.toEqual(before)

      const moved = await headers()

      await page.keyboard.press('Escape')
      await page.reload()
      await page.waitForLoadState('networkidle')
      expect(await headers()).toEqual(moved)
    } finally {
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Columns', exact: true }).click()

      const reset = page.getByRole('button', { name: /reset/i }).first()

      if (await reset.isVisible().catch(() => false)) await reset.click()

      await page.keyboard.press('Escape')
      await expect.poll(headers, { timeout: 10_000 }).toEqual(before)
    }
  })

  test('table rows: a row dragged in reorder mode is saved in its new position', async ({
    page,
  }) => {
    await open(page, '/admin/showcase/reorder')

    const rows = page.locator('tbody tr')
    const bodies = async () =>
      (await rows.locator('td:last-child').allInnerTexts()).map((text) => text.trim())
    const before = await bodies()

    expect(before.length).toBeGreaterThan(2)

    const toggle = (name: string) => page.getByRole('button', { name, exact: true })

    await toggle('Reorder').click()
    await expect(toggle('Done')).toBeVisible()
    await expect(rows.first()).toHaveAttribute('draggable', 'true')

    await drag(page, rows.nth(0), rows.nth(2), 'bottom')
    await expect.poll(bodies).not.toEqual(before)

    const moved = await bodies()

    await toggle('Done').click()
    await expect(toggle('Reorder')).toBeVisible()
    await page.waitForLoadState('networkidle')

    await page.reload()
    await page.waitForLoadState('networkidle')
    expect(await bodies()).toEqual(moved)

    // Back to the seeded order.
    await toggle('Reorder').click()
    await expect(rows.first()).toHaveAttribute('draggable', 'true')

    const index = moved.indexOf(before[0] ?? '')

    await drag(page, rows.nth(index), rows.nth(0), 'top')
    await expect.poll(bodies).toEqual(before)
    await toggle('Done').click()
    await page.waitForLoadState('networkidle')
    await page.reload()
    await page.waitForLoadState('networkidle')
    expect(await bodies()).toEqual(before)
  })
})

// ---------------------------------------------------------------- expired pages (0.2.8)

test.describe('an expired page', () => {
  test('with unsaved changes shows a notice and keeps what was typed until Reload', async ({
    page,
  }) => {
    await open(page, '/admin/posts/create')

    const title = page.getByRole('textbox', { name: 'Title' })

    await page.route('**/_alfakit/schema/refresh', (route) =>
      route.fulfill({
        status: 419,
        contentType: 'application/json',
        body: '{"message":"Page Expired"}',
      }),
    )

    await title.fill('Typed before the page expired')
    // `live(onBlur)`: the refresh is the request that comes back expired.
    await title.blur()

    const notice = toasts(page).filter({ hasText: 'This page has expired' }).first()

    await expect(notice).toBeVisible()
    await expect(notice).toContainText('Your changes are not saved')
    // Not reloaded: what was typed is still there to be copied.
    await page.waitForTimeout(1500)
    await expect(title).toHaveValue('Typed before the page expired')

    await page.unroute('**/_alfakit/schema/refresh')

    const reloaded = page.waitForEvent('load')

    await notice.getByRole('button', { name: 'Reload', exact: true }).click()
    await reloaded
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('')
  })

  test('without unsaved changes reloads on its own', async ({ page }) => {
    await open(page, '/admin/posts')

    let expired = 0

    await page.route('**/_alfakit/notifications*', async (route) => {
      if (expired++ === 0) {
        await route.fulfill({
          status: 419,
          contentType: 'application/json',
          body: '{"message":"Page Expired"}',
        })
      } else {
        await route.continue()
      }
    })

    const reloaded = page.waitForEvent('load', { timeout: 15_000 })

    // Opening the notifications panel asks the server for them.
    await page.locator('[data-slot="notifications-trigger"]').click()
    await reloaded

    await expect(page.locator('[data-slot="content"]').first()).toBeVisible()
    await expect(toasts(page).filter({ hasText: 'This page has expired' })).toHaveCount(0)
  })
})

// ---------------------------------------------------------------- request time limit (0.2.8)

test.describe('a background request that takes too long', () => {
  test('is given up after the panel time limit with a notice', async ({ page }) => {
    // `Panel::requestTimeout(1)`, as the server would send it: the playground panels set no
    // limit, so the page's panel props are given one on the way in.
    await page.route('**/admin/posts/create', async (route) => {
      if (route.request().resourceType() !== 'document') return route.continue()

      const response = await route.fetch()
      // The panel's props are in the page as JSON (plain, or escaped in an attribute).
      const html = (await response.text())
        .replace('"breadcrumbs":true', '"breadcrumbs":true,"requestTimeout":1')
        .replace(
          '&quot;breadcrumbs&quot;:true',
          '&quot;breadcrumbs&quot;:true,&quot;requestTimeout&quot;:1',
        )

      expect(html).toContain('requestTimeout')

      await route.fulfill({ response, body: html })
    })

    await open(page, '/admin/posts/create')
    await page.unroute('**/admin/posts/create')

    await page.route('**/_alfakit/schema/refresh', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000))
      await route.continue().catch(() => undefined)
    })

    const title = page.getByRole('textbox', { name: 'Title' })

    await title.fill('Slow refresh')
    await title.blur()

    await expect(toasts(page).filter({ hasText: 'The request took too long' }).first()).toBeVisible(
      {
        timeout: 8000,
      },
    )
    // What was typed stays.
    await expect(title).toHaveValue('Slow refresh')
  })
})

// ---------------------------------------------------------------- widgets

test.describe('widget filters and table widgets', () => {
  test('a chart widget reloads its data for the chosen filter', async ({ page }) => {
    await open(page, '/admin/showcase/gallery')

    const filter = page.getByRole('combobox', { name: 'Chart filter', exact: true })

    await expect(filter).toBeVisible()

    const values = await filter
      .locator('option')
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value))
    const current = await filter.inputValue()
    const other = values.find((value) => value !== current)

    expect(other).toBeTruthy()

    const reloaded = page.waitForResponse(
      (response) => response.url().includes('/admin/showcase/gallery') && response.status() === 200,
    )

    await filter.selectOption(other ?? '')
    await reloaded
    // The server drew the chart for the chosen filter and says so.
    await expect(filter).toHaveValue(other ?? '')

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('combobox', { name: 'Chart filter', exact: true })).toBeVisible()
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('a table widget renders on a dashboard, with its records or its empty state', async ({
    page,
  }) => {
    await open(page, '/admin/dashboard-benchmark')

    // `TableWidget` with `->heading('Latest records')`.
    await expect(page.getByText('Latest records', { exact: true }).first()).toBeVisible()

    const table = page.getByRole('table')

    // The benchmark records are seeded by a command of their own: a playground without
    // them shows the table's empty state instead of rows.
    if ((await table.count()) > 0) {
      expect(await table.first().getByRole('row').count()).toBeGreaterThan(1)
    } else {
      await expect(page.locator('[data-slot="content"]').first()).toContainText(
        /no .*(records|results)/i,
      )
    }
  })
})

// ---------------------------------------------------------------- failing requests

test.describe('a failing internal request', () => {
  for (const status of [500, 403]) {
    test(`a live refresh that answers ${status} shows a notification and keeps the form`, async ({
      page,
    }) => {
      await open(page, '/admin/posts/create')

      await page.route('**/_alfakit/schema/refresh', (route) =>
        route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify({ message: `Simulated ${status}` }),
        }),
      )

      const title = page.getByRole('textbox', { name: 'Title' })

      await title.fill('Refresh that fails')
      await title.blur()

      // Never silent: the configured notification for the status, or the generic one with
      // the server's message (the playgrounds run in debug mode).
      const toast = toasts(page).first()

      await expect(toast).toBeVisible()
      await expect(toast).toContainText(
        /The request failed|Something went wrong|Access denied|Simulated/i,
      )
      await expect(title).toHaveValue('Refresh that fails')
    })
  }
})
