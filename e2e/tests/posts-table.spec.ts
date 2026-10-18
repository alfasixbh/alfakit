import { expect, test } from '@playwright/test'
import { createPost, uniqueTitle } from '../fixtures/panel'

test.describe('posts table', () => {
  test('searches, sorts and paginates', async ({ page }) => {
    const title = uniqueTitle('Searchable post')
    await createPost(page, title)

    await page.goto('/admin/posts')
    const table = page.getByRole('table')
    await expect(table.getByRole('row')).toHaveCount(11) // header + 10 per page

    // Search narrows the rows to the one we created.
    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(title)
    await expect(table.getByRole('row').filter({ hasText: title })).toHaveCount(1)
    await expect(table.locator('tbody').getByRole('row')).toHaveCount(1)
    await expect(page).toHaveURL(/search=/)

    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('')
    await expect(table.locator('tbody').getByRole('row')).toHaveCount(10)

    // Sorting toggles `aria-sort` on the header and the sort appears in the URL.
    const views = page.getByRole('columnheader', { name: 'Views', exact: true })
    await views.getByRole('button').click()
    await expect(views).toHaveAttribute('aria-sort', 'ascending')
    await expect(page).toHaveURL(/sort=views/)
    await views.getByRole('button').click()
    await expect(views).toHaveAttribute('aria-sort', 'descending')

    const firstViews = await table.locator('tbody tr').first().locator('td').nth(6).innerText()
    const secondViews = await table.locator('tbody tr').nth(1).locator('td').nth(6).innerText()
    const toNumber = (text: string) => Number(text.replace(/[^\d]/g, ''))
    expect(toNumber(firstViews)).toBeGreaterThanOrEqual(toNumber(secondViews))

    // Pagination.
    await expect(page.getByText(/Showing 1–10 of \d+/)).toBeVisible()
    await page
      .getByRole('navigation', { name: 'Pagination', exact: true })
      .getByRole('button', { name: '2', exact: true })
      .click()
    await expect(page.getByText(/Showing 11–20 of \d+/)).toBeVisible()
    await expect(page).toHaveURL(/page=2/)
    await expect(table.locator('tbody').getByRole('row')).toHaveCount(10)
  })
})
