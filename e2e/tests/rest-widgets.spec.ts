import { type Locator, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { createPost, expectToast, pickOption } from '../fixtures/panel'
import { expect, test } from '../fixtures/test'

/**
 * Dashboards with filters and a table widget with actions of its own (docs:
 * widgets/dashboards, widgets/overview): the filter form above the widgets (a field that
 * waits for "Apply filters" and a `live()` one), filters edited in a header action and kept
 * in the URL, and a `TableWidget` whose row, modal and bulk actions run from the dashboard.
 */

const tinker = (renderer: string, code: string): string =>
  execFileSync('php', ['artisan', 'tinker', `--execute=${code}`], {
    cwd: `../playground/${renderer}`,
    encoding: 'utf8',
  })

/** Remove the posts a test made, for good (posts are soft-deleted otherwise). */
const removePosts = (renderer: string, token: string): void => {
  tinker(
    renderer,
    `\\App\\Models\\Post::withTrashed()->where('title', 'like', '%${token}%')->get()->each->forceDelete();`,
  )
}

const token = (): string => `wdg${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

const content = (page: Page): Locator => page.locator('[data-slot="content"]').first()
const rows = (page: Page): Locator => page.getByRole('table').locator('tbody').getByRole('row')
const row = (page: Page, text: string): Locator => rows(page).filter({ hasText: text })
const dialog = (page: Page): Locator => page.getByRole('dialog').last()

async function open(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await expect(page.getByRole('heading', { name: 'Filtered posts' })).toBeVisible()
  await page.waitForLoadState('networkidle')
}

const expectMatching = (page: Page, count: number) =>
  expect(content(page)).toContainText(new RegExp(`Matching posts\\s*${count}(\\D|$)`))

test.describe('a dashboard with a filter form (docs: widgets/dashboards)', () => {
  test('live and applied filters reach the widgets, survive a reload and reset', async ({
    page,
  }, info) => {
    test.setTimeout(120_000)

    const renderer = info.project.name
    const mark = token()
    const one = `${mark} one`
    const two = `${mark} two`

    try {
      await createPost(page, one)
      await createPost(page, two)
      await open(page, '/admin/showcase-dashboard')

      const search = page.getByRole('textbox', { name: 'Search', exact: true })

      // `live()`: typing filters the stat and the table without "Apply filters".
      await search.fill(mark)
      await expect(rows(page)).toHaveCount(2)
      await expectMatching(page, 2)
      await expect(row(page, one)).toBeVisible()
      await expect(row(page, two)).toBeVisible()

      // The table widget's own actions. A modal form, filled from the record and validated.
      await row(page, one).getByRole('button', { name: 'Rename', exact: true }).click()

      const title = dialog(page).getByRole('textbox', { name: 'Title' })

      await expect(title).toHaveValue(one)
      await title.fill('')
      await dialog(page).getByRole('button', { name: 'Submit', exact: true }).click()
      await expect(dialog(page).locator('[aria-invalid="true"]').first()).toBeVisible()
      await title.fill(`${one} renamed`)
      await dialog(page).getByRole('button', { name: 'Submit', exact: true }).click()
      await expectToast(page, 'Renamed')
      await expect(row(page, `${one} renamed`)).toBeVisible()
      // The live filter is still applied after the action.
      await expect(rows(page)).toHaveCount(2)

      // An action without a modal.
      await row(page, two).getByRole('button', { name: 'Feature', exact: true }).click()
      await expectToast(page, 'Featured')
      await expect(
        row(page, two).getByRole('button', { name: 'Unfeature', exact: true }),
      ).toBeVisible()

      // A bulk action on a selected row, with its confirmation.
      await row(page, two).getByRole('checkbox', { name: 'Select row' }).click()
      await page.getByRole('button', { name: 'Send to review', exact: true }).click()
      await dialog(page).getByRole('button', { name: 'Confirm', exact: true }).click()
      await expectToast(page, 'Sent to review')
      await expect(row(page, two)).toContainText('review')
      await expect(row(page, `${one} renamed`)).toContainText('draft')

      // The other field waits for "Apply filters".
      await pickOption(page, 'Status', 'In review')
      await page.waitForTimeout(800)
      await expect(rows(page)).toHaveCount(2)
      await page.getByRole('button', { name: 'Apply filters', exact: true }).click()
      await expect(rows(page)).toHaveCount(1)
      await expectMatching(page, 1)
      await expect(row(page, two)).toBeVisible()

      // Kept in the session: a reload and coming back from another page keep them.
      await page.reload()
      await page.waitForLoadState('networkidle')
      await expect(rows(page)).toHaveCount(1)
      await expect(page.getByRole('textbox', { name: 'Search', exact: true })).toHaveValue(mark)
      await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toContainText(
        'In review',
      )
      await page.goto('/admin/tags')
      await open(page, '/admin/showcase-dashboard')
      await expect(rows(page)).toHaveCount(1)
      await expectMatching(page, 1)

      // Reset clears both.
      await page.getByRole('button', { name: 'Reset', exact: true }).click()
      await expect(page.getByRole('textbox', { name: 'Search', exact: true })).toHaveValue('')
      await expect(rows(page)).toHaveCount(5)
      await expect(page.getByRole('button', { name: 'Reset', exact: true })).toHaveCount(0)

      // The widget's table pages on its own, under its own query-string key.
      await page
        .getByRole('navigation', { name: 'Pagination' })
        .getByRole('button', { name: '2', exact: true })
        .click()
      await expect(content(page)).toContainText(/Showing 6–10 of/)
      expect(new URL(page.url()).search).not.toBe('')
    } finally {
      // Never leave filters behind for the specs that open this dashboard later.
      await page.goto('/admin/showcase-dashboard')

      const reset = page.getByRole('button', { name: 'Reset', exact: true })

      if (await reset.isVisible().catch(() => false)) await reset.click()

      removePosts(renderer, mark)
    }
  })
})

test.describe('a dashboard with filters in a header action, kept in the URL', () => {
  test('the applied filters are in the address, shared by link, and reset', async ({
    page,
    context,
  }, info) => {
    test.setTimeout(120_000)

    const renderer = info.project.name
    const mark = token()
    const only = `${mark} shared`

    try {
      await createPost(page, only)
      await open(page, '/admin/showcase-dashboard-url')

      const filter = page
        .locator('[data-slot="page-header"]')
        .getByRole('button', { name: /Filter/ })

      await filter.click()
      await dialog(page).getByRole('textbox', { name: 'Search', exact: true }).fill(mark)
      await dialog(page)
        .getByRole('button', { name: /^(Apply|Apply filters|Submit)$/ })
        .click()

      await expect(rows(page)).toHaveCount(1)
      await expectMatching(page, 1)
      await expect(page).toHaveURL(/filters(%5B|\[)search(%5D|\])=/)
      // The badge counts the filters in use.
      await expect(filter).toContainText('1')

      // The link alone carries the filter: a second tab opened on it is filtered too.
      const shared = await context.newPage()

      await shared.goto(page.url())
      await expect(shared.getByRole('table').locator('tbody').getByRole('row')).toHaveCount(1)
      await shared.close()

      // The form starts from the applied values.
      await filter.click()
      await expect(dialog(page).getByRole('textbox', { name: 'Search', exact: true })).toHaveValue(
        mark,
      )
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)

      // An action of the table widget runs with the page's filters and keeps them.
      await row(page, only).getByRole('button', { name: 'Feature', exact: true }).click()
      await expectToast(page, 'Featured')
      await expect(rows(page)).toHaveCount(1)
      await expect(
        row(page, only).getByRole('button', { name: 'Unfeature', exact: true }),
      ).toBeVisible()
      await expect(page).toHaveURL(/filters(%5B|\[)search(%5D|\])=/)

      // Reset takes the filters out of the address.
      await filter.click()
      await dialog(page).getByRole('button', { name: 'Reset', exact: true }).click()
      await expect(page).not.toHaveURL(/filters/)
      await expect(rows(page)).toHaveCount(5)
    } finally {
      removePosts(renderer, mark)
    }
  })
})
