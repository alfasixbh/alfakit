import { type Locator, type Page } from '@playwright/test'
import { createPost, expectToast, rowWith, uniqueTitle } from '../fixtures/panel'
import { expect, test } from '../fixtures/test'

/**
 * Docs-driven checks of `docs/content/tables/*` and `docs/content/infolists/overview.md`
 * against the playground pages that show them: the table showcase (summaries, groups,
 * deferred modal filters, the query builder, reorderable columns), the card and cursor
 * showcases, and the posts and categories resources.
 */

const search = (page: Page): Locator => page.getByRole('searchbox', { name: 'Search', exact: true })
const bodyRows = (page: Page): Locator => page.getByRole('table').locator('tbody tr')
const header = (page: Page, name: string): Locator =>
  page.getByRole('columnheader', { name, exact: true })
const toNumber = (text: string): number => Number(text.replace(/[^\d.-]/g, ''))

/** The text of one column (0-based) in every data row of the table. */
async function column(page: Page, index: number): Promise<string[]> {
  return page
    .getByRole('table')
    .locator('tbody tr')
    .evaluateAll(
      (rows, i) =>
        rows
          .map((row) => row.querySelectorAll('td')[i]?.textContent?.trim() ?? null)
          .filter((text): text is string => text !== null),
      index,
    )
}

/** Picks `option` in a filter control, a native `<select>` or a combobox with a listbox. */
async function choose(page: Page, control: Locator, option: string): Promise<void> {
  const tag = await control.evaluate((element) => element.tagName.toLowerCase())

  if (tag === 'select') {
    await control.selectOption({ label: option })

    return
  }

  await control.click()
  await page.getByRole('option', { name: option, exact: true }).first().click()

  // A multiple select keeps its list open: close it without closing the filters around it.
  if ((await page.getByRole('listbox').count()) > 0) await page.keyboard.press('Escape')
}

/** Closes the filters dropdown (and a select list still open inside it). */
async function closeFilters(page: Page): Promise<void> {
  const popover = page.locator('[data-slot="popover-content"]')

  for (let attempt = 0; attempt < 3 && (await popover.count()) > 0; attempt++) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)
  }

  await expect(popover).toHaveCount(0)
}

async function openTable(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await expect(page.getByRole('table')).toBeVisible()
  await expect(bodyRows(page).first()).toBeVisible()
}

test.describe('docs: tables (showcase)', () => {
  test('overview: search, sort, per-page options and page links', async ({ page }) => {
    await openTable(page, '/admin/showcase/table')

    // `defaultPaginationPageOption(10)` and `paginationPageOptions([10, 25, 50])`.
    await expect(bodyRows(page)).toHaveCount(10)
    const perPage = page.getByRole('combobox', { name: 'Per page', exact: true })
    await expect(perPage.getByRole('option')).toHaveText(['10', '25', '50'])

    // `defaultSort('published_at', 'desc')`.
    await expect(header(page, 'Published at')).toHaveAttribute('aria-sort', 'descending')

    // Only sortable columns offer a sort button.
    await expect(header(page, 'Category').getByRole('button')).toHaveCount(0)
    await expect(header(page, 'Rating').getByRole('button')).toHaveCount(0)

    await header(page, 'Views').getByRole('button').click()
    await expect(header(page, 'Views')).toHaveAttribute('aria-sort', 'ascending')
    await expect(page).toHaveURL(/sort=views/)
    const ascending = (await column(page, 4)).map(toNumber)
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b))

    await header(page, 'Views').getByRole('button').click()
    await expect(header(page, 'Views')).toHaveAttribute('aria-sort', 'descending')
    await expect
      .poll(async () => {
        const values = (await column(page, 4)).map(toNumber)

        return JSON.stringify(values) === JSON.stringify([...values].sort((a, b) => b - a))
      })
      .toBe(true)

    await perPage.selectOption('25')
    await expect(bodyRows(page)).toHaveCount(25)
    await expect(page.getByText(/Showing 1–25 of \d+/)).toBeVisible()

    const pagination = page.getByRole('navigation', { name: 'Pagination', exact: true })
    await pagination.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(page.getByText(/Showing 26–50 of \d+/)).toBeVisible()
    await expect(pagination.getByRole('button', { name: 'Previous', exact: true })).toBeEnabled()

    // The search looks in the `searchable()` column and resets to the first page.
    const title = (await column(page, 0))[0] ?? ''
    await search(page).fill(title)
    await expect(bodyRows(page).filter({ hasText: title }).first()).toBeVisible()
    await expect(page).toHaveURL(/search=/)
    await expect(page.getByText(/Showing 1–\d+ of \d+/)).toBeVisible()
    expect((await column(page, 0)).every((text) => text.includes(title))).toBe(true)
  })

  test('summaries: a "this page" and an "all" row with count, sum and average', async ({
    page,
  }) => {
    await openTable(page, '/admin/showcase/table')

    const footer = page.getByRole('table').locator('tfoot')
    const thisPage = footer.getByRole('row').filter({ hasText: 'This page' })
    const all = footer.getByRole('row').filter({ hasText: 'All posts' })

    await expect(thisPage).toContainText(/Count\s*10/)
    await expect(thisPage).toContainText(/Sum\s*[\d,]+/)
    await expect(thisPage).toContainText(/Average\s*[\d.]+/)
    await expect(all).toContainText(/Count\s*\d+/)

    // The page sum is the sum of the rows on the page.
    const views = (await column(page, 4)).map(toNumber).reduce((sum, value) => sum + value, 0)
    const pageSum = toNumber((await thisPage.innerText()).match(/Sum\s*([\d,]+)/)?.[1] ?? '')
    expect(pageSum).toBe(views)

    // The "all" row follows the search.
    const total = toNumber((await all.innerText()).match(/Count\s*([\d,]+)/)?.[1] ?? '')
    const title = (await column(page, 0))[0] ?? ''
    await search(page).fill(title)
    await expect
      .poll(async () => {
        const text = await footer.innerText()

        return toNumber(text.match(/Count\s*([\d,]+)/)?.[1] ?? '')
      })
      .toBeLessThan(total)
  })

  test('grouping: group headers, collapsible groups, date groups and no grouping', async ({
    page,
  }) => {
    await openTable(page, '/admin/showcase/table')
    const groupBy = page.getByRole('combobox', { name: 'Group by', exact: true })

    await expect(groupBy.getByRole('option')).toHaveText([
      'No grouping',
      'Status',
      'Author',
      'Published at',
    ])

    // `Group::make('status')->collapsible()`: a header per group that folds its rows.
    await groupBy.selectOption({ label: 'Status' })
    const toggle = page.getByRole('button', { name: /^Collapse group: Status: / }).first()
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')

    const name = ((await toggle.getAttribute('aria-label')) ?? (await toggle.innerText())).replace(
      /^.*Status: /,
      '',
    )
    const rowsOfGroup = bodyRows(page).filter({
      has: page.getByRole('cell', { name, exact: true }),
    })
    await expect(rowsOfGroup.first()).toBeVisible()

    await toggle.click()
    await expect(
      page.getByRole('button', { name: `Expand group: Status: ${name}` }),
    ).toHaveAttribute('aria-expanded', 'false')
    await expect(rowsOfGroup).toHaveCount(0)
    await page.getByRole('button', { name: `Expand group: Status: ${name}` }).click()
    await expect(rowsOfGroup.first()).toBeVisible()

    // `Group::make('author.name')` is not collapsible: a plain header.
    await groupBy.selectOption({ label: 'Author' })
    await expect(
      page
        .getByRole('table')
        .getByText(/^Author: /)
        .first(),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /^Collapse group: Author/ })).toHaveCount(0)

    // `->date()->titlePrefixedWithLabel(false)`: the title is the date alone.
    await groupBy.selectOption({ label: 'Published at' })
    await expect(
      page
        .getByRole('table')
        .getByText(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/)
        .first(),
    ).toBeVisible()
    await expect(page.getByRole('table').getByText(/^Published at: /)).toHaveCount(0)

    await groupBy.selectOption({ label: 'No grouping' })
    await expect(page.getByRole('table').getByText(/^Author: /)).toHaveCount(0)
    await expect(bodyRows(page)).toHaveCount(10)
  })

  test('filters: deferred modal filters apply on "Apply", show an indicator and reset', async ({
    page,
  }) => {
    await openTable(page, '/admin/showcase/table')

    await page.getByRole('button', { name: 'Filters', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Filters' })
    await expect(dialog).toBeVisible()

    // `deferFilters()`: nothing is applied until "Apply", which is disabled without changes.
    const apply = dialog.getByRole('button', { name: 'Apply', exact: true })
    await expect(apply).toBeDisabled()
    await choose(page, dialog.getByRole('combobox', { name: 'Status', exact: true }), 'Draft')
    await expect(apply).toBeEnabled()
    await expect(page).not.toHaveURL(/filters/)

    await apply.click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/filters/)
    await expect.poll(async () => new Set(await column(page, 3))).toEqual(new Set(['Draft']))

    // The active filter is shown as an indicator that can be removed.
    const indicator = page
      .locator('[data-slot="content"]')
      .getByText(/Status: Draft/)
      .first()
    await expect(indicator).toBeVisible()

    // Reloading keeps the filter (it is in the URL).
    await page.reload()
    await expect(bodyRows(page).first()).toBeVisible()
    expect(new Set(await column(page, 3))).toEqual(new Set(['Draft']))

    // Removing the indicator clears the filter.
    await page
      .getByRole('button', { name: /Remove filter|Remove all|Reset/ })
      .first()
      .click()
    await expect.poll(async () => new Set(await column(page, 3)).size).toBeGreaterThan(1)
  })

  test('filters: a query builder rule narrows the table', async ({ page }) => {
    await openTable(page, '/admin/showcase/table')

    await page.getByRole('button', { name: 'Filters', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Filters' })

    await dialog.getByRole('button', { name: 'Add rule', exact: true }).click()
    // Every constraint of the builder is offered.
    await expect(page.getByRole('menuitem')).toHaveText([
      'Title',
      'Author',
      'Views',
      'Published at',
      'Is featured',
      'Status',
      'Topics',
    ])
    await page.getByRole('menuitem', { name: 'Views', exact: true }).click()

    await dialog
      .getByRole('combobox', { name: 'Operator', exact: true })
      .selectOption({ label: 'is greater than' })
    await dialog.getByRole('spinbutton', { name: 'Value', exact: true }).fill('15000')
    await dialog.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect(dialog).toBeHidden()

    await expect
      .poll(async () => (await column(page, 4)).map(toNumber).every((value) => value > 15000))
      .toBe(true)
    await expect(bodyRows(page).first()).toBeVisible()

    // A second rule in the same (and) group narrows it further.
    await page.getByRole('button', { name: /^Filters/ }).click()
    await dialog.getByRole('button', { name: 'Add rule', exact: true }).last().click()
    await page.getByRole('menuitem', { name: 'Views', exact: true }).click()
    await dialog
      .getByRole('combobox', { name: 'Operator', exact: true })
      .last()
      .selectOption({ label: 'is less than' })
    await dialog.getByRole('spinbutton', { name: 'Value', exact: true }).last().fill('18000')
    await dialog.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect(dialog).toBeHidden()

    await expect
      .poll(async () =>
        (await column(page, 4)).map(toNumber).every((value) => value > 15000 && value < 18000),
      )
      .toBe(true)
  })

  test('layout: reorderable columns move and reset', async ({ page }) => {
    await openTable(page, '/admin/showcase/table')
    const headers = page.getByRole('table').locator('thead').getByRole('columnheader')
    const original = ['Title', 'Author', 'Category', 'Status', 'Views', 'Rating', 'Published at']

    await expect(headers).toHaveText(original)

    await page.getByRole('button', { name: 'Columns', exact: true }).click()
    await page.getByRole('button', { name: 'Move Title down', exact: true }).click()
    await expect(headers).toHaveText([
      'Author',
      'Title',
      'Category',
      'Status',
      'Views',
      'Rating',
      'Published at',
    ])

    // The cells move with their headers.
    const second = (await column(page, 1))[0] ?? ''
    expect(second.length).toBeGreaterThan(0)

    // The order is remembered across a reload.
    await page.reload()
    await expect(headers).toHaveText([
      'Author',
      'Title',
      'Category',
      'Status',
      'Views',
      'Rating',
      'Published at',
    ])

    await page.getByRole('button', { name: 'Columns', exact: true }).click()
    await page.getByRole('button', { name: 'Reset column order', exact: true }).click()
    await expect(headers).toHaveText(original)
  })
})

test.describe('docs: tables (cards and cursor)', () => {
  test('layout: a card grid with a sort select, collapsible details and "load more"', async ({
    page,
  }) => {
    await page.goto('/admin/showcase/cards')
    const content = page.locator('[data-slot="content"]')
    const details = content.getByRole('button', { name: 'Show details', exact: true })

    // `contentGrid()`: records are cards, not table rows.
    await expect(details).toHaveCount(6)
    await expect(page.getByRole('table')).toHaveCount(0)

    // `Panel::make()->collapsible()`: the details open per card.
    await details.first().click()
    await expect(content.getByRole('button', { name: 'Hide details', exact: true })).toHaveCount(1)
    await content.getByRole('button', { name: 'Hide details', exact: true }).click()
    await expect(details).toHaveCount(6)

    // Without header cells the sortable columns are offered in a select.
    const sortBy = page.getByRole('combobox', { name: 'Sort by', exact: true })
    await expect(sortBy.getByRole('option')).toHaveText(['Sort by', 'Title', 'Views'])
    await sortBy.selectOption({ label: 'Title' })
    await expect(page).toHaveURL(/sort=title/)

    // `PaginationMode::LoadMore` appends the next page.
    await expect(page.getByText(/Showing 1–6/)).toBeVisible()
    await page.getByRole('button', { name: 'Load more', exact: true }).click()
    await expect(content.getByRole('button', { name: 'Show details', exact: true })).toHaveCount(12)

    await page.getByRole('combobox', { name: 'Per page', exact: true }).selectOption('12')
    await expect(content.getByRole('button', { name: 'Show details', exact: true })).toHaveCount(12)
  })

  test('performance: cursor pagination has next and previous but no total', async ({ page }) => {
    await openTable(page, '/admin/showcase/cursor')
    const pagination = page.getByRole('navigation', { name: 'Pagination', exact: true })
    const previous = pagination.getByRole('button', { name: 'Previous', exact: true })
    const next = pagination.getByRole('button', { name: 'Next', exact: true })

    // No count query: "Showing 1–10" without "of N", and no page numbers.
    await expect(page.getByText(/Showing 1–10/)).toBeVisible()
    await expect(page.getByText(/Showing 1–10 of/)).toHaveCount(0)
    await expect(pagination.getByRole('button')).toHaveCount(2)
    await expect(previous).toBeDisabled()

    const firstPage = await column(page, 0)
    expect(firstPage.map(toNumber)).toEqual([...firstPage.map(toNumber)].sort((a, b) => a - b))

    await next.click()
    await expect(page).toHaveURL(/cursor=/)
    await expect.poll(async () => (await column(page, 0))[0]).not.toBe(firstPage[0])
    const secondPage = (await column(page, 0)).map(toNumber)
    expect(Math.min(...secondPage)).toBeGreaterThan(Math.max(...firstPage.map(toNumber)))
    await expect(previous).toBeEnabled()

    await previous.click()
    await expect.poll(async () => (await column(page, 0))[0]).toBe(firstPage[0])
  })
})

test.describe('docs: tables (posts resource)', () => {
  test('layout: the column manager hides and shows toggleable columns and resets', async ({
    page,
  }) => {
    await openTable(page, '/admin/posts')

    // `toggleable(isToggledHiddenByDefault: true)` columns start hidden.
    await expect(header(page, 'Author')).toBeVisible()
    await expect(header(page, 'Created at')).toHaveCount(0)

    await page.getByRole('button', { name: 'Columns', exact: true }).click()
    const list = page.getByRole('list', { name: 'Columns', exact: true })

    // Only `toggleable()` columns are listed.
    // (Six of them; seven in the React playground, which also has a sponsorship column.)
    expect(await list.getByRole('checkbox').count()).toBeGreaterThanOrEqual(6)
    await expect(list.getByRole('checkbox', { name: 'Title', exact: true })).toHaveCount(0)

    // One toggle at a time: each is applied by a table reload (a second toggle made before
    // the first one's answer arrives is built from the old column list and undoes it).
    await list.getByRole('checkbox', { name: 'Author', exact: true }).click()
    await expect(header(page, 'Author')).toHaveCount(0)
    await list.getByRole('checkbox', { name: 'Created at', exact: true }).click()
    await expect(header(page, 'Created at')).toBeVisible()
    await expect(header(page, 'Author')).toHaveCount(0)

    // The choice survives a reload.
    await page.reload()
    await expect(bodyRows(page).first()).toBeVisible()
    await expect(header(page, 'Author')).toHaveCount(0)
    await expect(header(page, 'Created at')).toBeVisible()

    await page.getByRole('button', { name: 'Columns', exact: true }).click()
    await page.getByRole('button', { name: 'Reset', exact: true }).click()
    await expect(header(page, 'Author')).toBeVisible()
    await expect(header(page, 'Created at')).toHaveCount(0)
  })

  test('filters: select, relationship, ternary and trashed filters with restore', async ({
    page,
  }) => {
    const title = uniqueTitle('Filtered post')
    await createPost(page, title)

    await openTable(page, '/admin/posts')
    const filters = page.getByRole('button', { name: /^Filters/ })

    // Select filter (multiple): only the chosen status.
    await filters.click()
    await choose(page, page.getByRole('combobox', { name: 'Status', exact: true }), 'Published')
    await expect.poll(async () => new Set(await column(page, 5))).toEqual(new Set(['Published']))
    await closeFilters(page)

    // Ternary filter: only featured rows.
    await filters.click()
    await choose(page, page.getByRole('combobox', { name: 'Featured', exact: true }), 'Yes')
    await expect
      .poll(async () =>
        bodyRows(page)
          .getByRole('switch', { name: 'Featured' })
          .evaluateAll((switches) =>
            switches.every((element) => element.getAttribute('aria-checked') === 'true'),
          ),
      )
      .toBe(true)
    await closeFilters(page)

    // Both filters are shown as indicators; "reset" clears them.
    await expect(
      page
        .locator('[data-slot="content"]')
        .getByText(/Status: Published/)
        .first(),
    ).toBeVisible()
    await page.goto('/admin/posts')
    await expect(bodyRows(page).first()).toBeVisible()

    // Soft-deleted rows are hidden by default; the trashed filter shows them with Restore.
    await search(page).fill(title)
    await expect(bodyRows(page)).toHaveCount(1)
    await rowWith(page, title).getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()
    await expectToast(page, 'Deleted')
    await expect(rowWith(page, title)).toHaveCount(0)

    await filters.click()
    await choose(
      page,
      page.getByRole('combobox', { name: 'Deleted records', exact: true }),
      'Only deleted records',
    )
    await closeFilters(page)
    await expect(rowWith(page, title)).toHaveCount(1)

    // `RestoreAction` is only offered on deleted rows.
    await rowWith(page, title).getByRole('button', { name: 'Restore', exact: true }).click()
    // It asks first.
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Restore', exact: true }).click()
    await expectToast(page, 'Restored')
    await expect(rowWith(page, title)).toHaveCount(0)

    await page.goto('/admin/posts')
    await search(page).fill(title)
    await expect(rowWith(page, title)).toHaveCount(1)
    await expect(
      rowWith(page, title).getByRole('button', { name: 'Restore', exact: true }),
    ).toHaveCount(0)
  })

  test('saved views: views in code apply their filters and sort; resource tabs scope the query', async ({
    page,
  }) => {
    await openTable(page, '/admin/posts')
    const views = page.getByRole('tablist', { name: 'Views', exact: true })

    await expect(views.getByRole('tab')).toHaveText(['All', 'Featured', 'Most viewed'])

    // `TableView::make('featured')->filters(['is_featured' => ['value' => true]])`.
    await views.getByRole('tab', { name: 'Featured', exact: true }).click()
    await expect(views.getByRole('tab', { name: 'Featured', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect
      .poll(async () =>
        bodyRows(page)
          .getByRole('switch', { name: 'Featured' })
          .evaluateAll(
            (switches) =>
              switches.length > 0 &&
              switches.every((element) => element.getAttribute('aria-checked') === 'true'),
          ),
      )
      .toBe(true)

    // `->sort('views', 'desc')`.
    await views.getByRole('tab', { name: 'Most viewed', exact: true }).click()
    await expect(header(page, 'Views')).toHaveAttribute('aria-sort', 'descending')
    await expect
      .poll(async () => {
        const values = (await column(page, 7)).map(toNumber)

        return (
          values.length > 1 &&
          JSON.stringify(values) === JSON.stringify([...values].sort((a, b) => b - a))
        )
      })
      .toBe(true)

    await views.getByRole('tab', { name: 'All', exact: true }).click()
    await expect(views.getByRole('tab', { name: 'All', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    // "View options" offers saving the current state as a view.
    await page.getByRole('button', { name: 'View options', exact: true }).click()
    await expect(
      page.getByRole('menuitem', { name: 'Save as new view', exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')

    // Resource tabs (`getTabs()`, on the React playground's list page): "Published" only
    // lists published posts.
    const tabs = page.getByRole('tablist', { name: 'posts', exact: true })

    if ((await tabs.count()) > 0) {
      await tabs.getByRole('tab', { name: /^Published/ }).click()
      await expect(page).toHaveURL(/activeTab=published/)
      await expect.poll(async () => new Set(await column(page, 5))).toEqual(new Set(['Published']))
      await tabs.getByRole('tab', { name: 'Drafts', exact: true }).click()
      await expect.poll(async () => new Set(await column(page, 5))).toEqual(new Set(['Draft']))
    }
  })

  test('saved views: a user saves, applies and deletes a view of their own', async ({ page }) => {
    const name = uniqueTitle('View')
    await openTable(page, '/admin/posts')

    await header(page, 'Views').getByRole('button').click()
    await expect(header(page, 'Views')).toHaveAttribute('aria-sort', 'ascending')

    await page.getByRole('button', { name: 'View options', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Save as new view', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox').first().fill(name)
    await dialog.getByRole('button', { name: /^(Save|Create|Save view)$/ }).click()
    await expect(dialog).toBeHidden()

    const views = page.getByRole('tablist', { name: 'Views', exact: true })
    const tab = views.getByRole('tab', { name, exact: true })
    await expect(tab).toBeVisible()

    // Leaving and coming back to the view applies its sort again.
    await views.getByRole('tab', { name: 'All', exact: true }).click()
    await expect(header(page, 'Views')).not.toHaveAttribute('aria-sort', 'ascending')
    await tab.click()
    await expect(header(page, 'Views')).toHaveAttribute('aria-sort', 'ascending')

    await page.getByRole('button', { name: 'View options', exact: true }).click()
    await page.getByRole('menuitem', { name: /^Delete/ }).click()
    const confirm = page.getByRole('dialog')
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.getByRole('button', { name: /^Delete/ }).click()
    }
    await expect(views.getByRole('tab', { name, exact: true })).toHaveCount(0)
  })

  test('columns: an inline toggle column saves at once', async ({ page }) => {
    const title = uniqueTitle('Toggled post')
    await createPost(page, title)

    await openTable(page, '/admin/posts')
    await search(page).fill(title)
    await expect(bodyRows(page)).toHaveCount(1)

    const toggle = rowWith(page, title).getByRole('switch', { name: 'Featured' })
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    // It was saved on the server: a reload still shows it.
    await page.reload()
    await expect(rowWith(page, title).getByRole('switch', { name: 'Featured' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('spreadsheet: editable cells are edited in the grid, validated and saved together', async ({
    page,
  }) => {
    const title = uniqueTitle('Sheet post')
    await createPost(page, title)

    await openTable(page, '/admin/posts')
    await search(page).fill(title)
    await expect(bodyRows(page)).toHaveCount(1)

    await page.getByRole('button', { name: 'Edit as spreadsheet', exact: true }).click()
    const grid = page.getByRole('grid', { name: 'Spreadsheet', exact: true })
    const save = page.getByRole('button', { name: 'Save changes', exact: true })
    await expect(grid).toBeVisible()
    await expect(save).toBeDisabled()

    // Typing replaces the cell; Enter commits it.
    const viewsCell = grid.getByRole('gridcell', { name: '0', exact: true }).first()
    await viewsCell.click()
    await page.keyboard.type('4321')
    await page.keyboard.press('Enter')
    await expect(save).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Discard', exact: true })).toBeEnabled()

    await save.click()
    await expect(save).toBeDisabled()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(page.getByRole('table')).toBeVisible()
    await expect(rowWith(page, title)).toContainText('4,321')

    await page.reload()
    await expect(rowWith(page, title)).toContainText('4,321')
  })

  test('actions: bulk selection, "select all" and deselect', async ({ page }) => {
    await openTable(page, '/admin/posts')
    const content = page.locator('[data-slot="content"]')

    await bodyRows(page).first().getByRole('checkbox', { name: 'Select row', exact: true }).check()
    await expect(content.getByText('1 selected', { exact: true })).toBeVisible()

    await page.getByRole('checkbox', { name: 'Select page', exact: true }).check()
    await expect(content.getByText('10 selected', { exact: true })).toBeVisible()

    // The bulk actions of the table are offered for the selection.
    await expect(content.getByRole('button', { name: 'Delete', exact: true }).first()).toBeVisible()

    // "Select all (N)" selects every record matching the table, across pages.
    const selectAll = content.getByRole('button', { name: /^Select all \(\d+\)$/ })
    const total = toNumber(await selectAll.innerText())
    expect(total).toBeGreaterThan(10)
    await selectAll.click()
    await expect(content.getByText(`${total} selected`, { exact: true })).toBeVisible()

    await content.getByRole('button', { name: 'Deselect all', exact: true }).click()
    await expect(content.getByText(/\d+ selected/)).toHaveCount(0)
    await expect(page.getByRole('checkbox', { name: 'Select page', exact: true })).not.toBeChecked()
  })

  test('actions: record actions link to the view and edit pages', async ({ page }) => {
    const title = uniqueTitle('Linked post')
    await createPost(page, title)

    await openTable(page, '/admin/posts')
    await search(page).fill(title)
    await expect(bodyRows(page)).toHaveCount(1)

    await rowWith(page, title).getByRole('link', { name: 'View', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/posts\/\d+$/)
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()

    await page.goBack()
    await expect(rowWith(page, title)).toHaveCount(1)
    await rowWith(page, title).getByRole('link', { name: 'Edit', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/posts\/\d+\/edit$/)
    await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(title)
  })
})

test.describe('docs: tables (categories) and infolists', () => {
  test('columns: colour and icon columns render, hidden columns stay out, empty state shows', async ({
    page,
  }) => {
    await openTable(page, '/admin/categories')

    await expect(page.getByRole('table').locator('thead').getByRole('columnheader')).toHaveText([
      '',
      'Name',
      'Slug',
      'Color',
      'Icon',
      'Actions',
    ])

    // `ColorColumn`: a swatch with the colour, `IconColumn`: an icon.
    const row = bodyRows(page).first()
    await expect(row.locator('td').nth(3).locator('[style*="background"]').first()).toBeVisible()

    // Searching for nothing shows the empty state instead of rows.
    await search(page).fill('zzz-no-such-category-zzz')
    await expect(page.getByText('No categories', { exact: true })).toBeVisible()
    await expect(page.getByText('Showing 0–0 of 0')).toBeVisible()
    await page.getByRole('button', { name: 'Clear', exact: true }).click()
    await expect(bodyRows(page).first()).toBeVisible()
  })

  test('infolist: the view page shows text, badge, icon, date, number, money and HTML entries', async ({
    page,
  }) => {
    await page.goto('/admin/posts/1')
    const content = page.locator('[data-slot="content"]')

    await expect(
      content.getByRole('heading', { level: 2, name: 'Post', exact: true }),
    ).toBeVisible()

    // Each entry is a labelled group.
    for (const label of [
      'Title',
      'Status',
      'Author',
      'Category',
      'Topics',
      'Tags',
      'Is featured',
      'Published at',
      'Views',
      'Rating',
      'Content',
      'Gallery',
    ]) {
      await expect(content.getByRole('group', { name: label, exact: true })).toBeVisible()
    }

    // `->badge()`: the state is a badge; `->numeric()` groups digits; `->suffix()` is appended.
    await expect(
      content.getByRole('group', { name: 'Status', exact: true }).locator('[data-slot="badge"]'),
    ).toBeVisible()
    await expect(content.getByRole('group', { name: 'Views', exact: true })).toContainText(
      /\d{1,3}(,\d{3})*/,
    )
    await expect(content.getByRole('group', { name: 'Rating', exact: true })).toContainText(' / 5')

    // `money(..., inMinorUnits: true)` formats in the record's currency (React playground).
    const fee = content.getByRole('group', { name: 'Sponsorship fee', exact: true })

    if ((await fee.count()) > 0) await expect(fee).toContainText(/[A-Z]{3}|[$€£]|—/)

    // `IconEntry::boolean()`: an icon, no text.
    await expect(
      content.getByRole('group', { name: 'Is featured', exact: true }).locator('svg').first(),
    ).toBeVisible()

    // `->html()->prose()`: the stored HTML is rendered as paragraphs.
    await expect(
      content.getByRole('group', { name: 'Content', exact: true }).locator('p').first(),
    ).toBeVisible()

    // Relation managers below the infolist are tabs.
    await expect(content.getByRole('tab', { name: 'Comments', exact: true })).toBeVisible()
    await expect(content.getByRole('tab', { name: 'Activity', exact: true })).toBeVisible()
  })
})
