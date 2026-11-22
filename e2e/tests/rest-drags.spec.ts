import { type Locator, type Page } from '@playwright/test'
import { rmSync } from 'node:fs'
import { expectToast, toasts, uniqueTitle } from '../fixtures/panel'
import { expect, test } from '../fixtures/test'

/**
 * Three drags with the real mouse that no other spec makes: a calendar event resized by its
 * end edge, two uploaded files swapped (`FileUpload::reorderable()`), and a repeater item
 * dragged by its handle. What is asserted is what the server holds or receives afterwards,
 * not the order on screen.
 */

const GALLERY = '/admin/showcase/gallery'

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

/**
 * The JSON the gallery's Save action echoes in its notification: what the server received.
 * Once per page load: the page keeps nothing, so the form is back to its seed afterwards.
 */
async function save(page: Page): Promise<Record<string, unknown>> {
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  const toast = toasts(page).filter({ hasText: 'Validated' }).first()

  await expect(toast).toBeVisible()

  const text = await toast.innerText()

  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as Record<
    string,
    unknown
  >
}

async function openGallery(page: Page): Promise<void> {
  await page.goto(GALLERY)
  await expect(page.getByRole('heading', { level: 1, name: 'Gallery' })).toBeVisible()
  await page.waitForLoadState('networkidle')
  // Save validates the whole form: the page's wizard has to be gone through first.
  await page.getByRole('textbox', { name: 'Account email' }).fill('drags@example.com')
  await page.getByRole('button', { name: 'Next', exact: true }).first().click()
  await page.getByRole('radio', { name: 'Team' }).check()
  await page.getByRole('button', { name: 'Next', exact: true }).first().click()
  await page.getByRole('checkbox', { name: 'I accept the terms' }).check()
}

test.describe('the remaining drags', () => {
  test('calendar: an event resized by its end edge keeps the new end', async ({ page }) => {
    const title = uniqueTitle('E2E resize')
    const pad = (value: number) => String(value).padStart(2, '0')
    const now = new Date()
    const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

    await page.goto('/admin/calendar')
    await expect(page.locator('[data-slot="content"]').first()).toBeVisible()
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'New calendar event', exact: true }).click()
    await dialog(page).getByRole('textbox', { name: 'Title' }).fill(title)
    await dialog(page).getByRole('textbox', { name: 'Starts at' }).fill(`${day}T10:00`)
    await dialog(page).getByRole('textbox', { name: 'Ends at' }).fill(`${day}T11:00`)
    await dialog(page).getByRole('button', { name: 'Create', exact: true }).click()
    await expectToast(page, /created/i)

    const calendar = page.getByRole('region', { name: 'Events and publications' })
    // The week view draws a timed event as a block whose bottom edge is its end.
    const week = async () => {
      await calendar.locator('.fc-timeGridWeek-button').click()
      await expect(calendar.locator('.fc-timegrid').first()).toBeVisible()
    }
    const event = () => calendar.locator('.fc-timegrid-event').filter({ hasText: title }).first()
    const endsAt = async (): Promise<string> => {
      await event().click()

      const field = dialog(page).getByRole('textbox', { name: 'Ends at' })

      await expect(field).toBeVisible()

      const value = await field.inputValue()

      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)

      return value
    }

    try {
      await week()
      await expect(event()).toBeVisible()
      await event().scrollIntoViewIfNeeded()
      expect(await endsAt()).toBe(`${day}T11:00`)

      // The resizer only exists while the pointer is over the event.
      await event().hover()

      const resizer = event().locator('.fc-event-resizer-end')

      await expect(resizer).toBeVisible()

      const handle = await resizer.boundingBox()
      const slot = await calendar.locator('.fc-timegrid-slot-lane').first().boundingBox()

      if (!handle || !slot) throw new Error('the resize handle is not on screen')

      // Two slots of thirty minutes down: 11:00 becomes 12:00.
      const x = handle.x + handle.width / 2
      const y = handle.y + handle.height / 2
      const saved = page.waitForResponse(
        (response) =>
          response.url().includes('/_alfakit/') && response.request().method() === 'POST',
      )

      await page.mouse.move(x, y)
      await page.mouse.down()
      await page.mouse.move(x, y + 4, { steps: 3 })
      await page.mouse.move(x, y + slot.height * 2, { steps: 12 })
      await page.waitForTimeout(150)
      await page.mouse.up()
      expect((await saved).status()).toBe(200)

      expect(await endsAt()).toBe(`${day}T12:00`)

      await page.reload()
      await page.waitForLoadState('networkidle')
      await week()
      await expect(event()).toBeVisible()
      expect(await endsAt()).toBe(`${day}T12:00`)
    } finally {
      const shown = calendar.getByText(title)

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

  test('file upload: two files swapped by dragging are submitted in the new order', async ({
    page,
  }, info) => {
    const token = Date.now().toString(36)
    const alpha = `alpha-${token}.txt`
    const beta = `beta-${token}.txt`

    await openGallery(page)

    const field = page
      .locator('[data-slot="field"]')
      .filter({ has: page.getByText('Attachments', { exact: true }) })
      .first()
    const files = field.getByRole('listitem')
    const item = (name: string) => files.filter({ hasText: name }).first()

    try {
      await field.locator('input[type="file"]').setInputFiles([
        { name: alpha, mimeType: 'text/plain', buffer: Buffer.from('alpha') },
        { name: beta, mimeType: 'text/plain', buffer: Buffer.from('beta') },
      ])
      await expect(item(alpha)).toBeVisible()
      await expect(item(beta)).toBeVisible()
      await expect(field.getByRole('progressbar')).toHaveCount(0)
      await expect(files.nth(0)).toContainText(alpha)
      await expect(files.nth(1)).toContainText(beta)
      // Both are stored (an item still uploading has no move buttons and cannot be dragged).
      await expect(field.getByRole('button', { name: `Move ${alpha} down` })).toBeEnabled()
      await expect(field.getByRole('button', { name: `Move ${beta} up` })).toBeEnabled()

      await drag(page, item(beta), item(alpha))
      await expect(files.nth(0)).toContainText(beta)
      await expect(files.nth(1)).toContainText(alpha)

      // `preserveFilenames()`: the stored names are the picked ones, in the order submitted.
      expect((await save(page)).attachments).toEqual([beta, alpha])
    } finally {
      const directory = `../playground/${info.project.name}/storage/app/private/showcase`

      for (const name of [alpha, beta]) rmSync(`${directory}/${name}`, { force: true })
    }
  })

  test('repeater: an item dragged by its handle is submitted in its new position', async ({
    page,
  }) => {
    await openGallery(page)

    const steps = page.getByRole('list', { name: 'Checklist', exact: true })
    const items = steps.locator(':scope > li')
    const handle = (index: number) =>
      items.nth(index).locator('[data-slot="item-header"] .cursor-grab').first()
    const names = () =>
      items.evaluateAll((list) =>
        list.map((entry) => (entry.querySelector('input') as HTMLInputElement | null)?.value),
      )

    await expect(items).toHaveCount(3)
    expect(await names()).toEqual(['First', 'Second', 'Third'])

    // The third item onto the first: it takes the first place.
    await drag(page, handle(2), items.nth(0))
    await expect.poll(names).toEqual(['Third', 'First', 'Second'])

    // The new first item onto the last: it goes to the end.
    await drag(page, handle(0), items.nth(2))
    await expect.poll(names).toEqual(['First', 'Second', 'Third'])

    // And one more, which is the order that is saved.
    await drag(page, handle(1), items.nth(0))
    await expect.poll(names).toEqual(['Second', 'First', 'Third'])
    expect((await save(page)).steps).toEqual(['Second', 'First', 'Third'])
  })
})
