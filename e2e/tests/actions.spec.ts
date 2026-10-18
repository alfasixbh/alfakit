import { expect, test } from '@playwright/test'
import { createPost, expectToast, rowWith, uniqueTitle } from '../fixtures/panel'

test.describe('actions', () => {
  test('runs a record action behind a confirmation modal', async ({ page }) => {
    const title = uniqueTitle('Delete me')
    await createPost(page, title)

    await page.goto('/admin/posts')
    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(title)
    const row = rowWith(page, title)
    await expect(row).toHaveCount(1)

    await row.getByRole('button', { name: 'Delete', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(`Delete ${title}`)
    // Focus moves into the modal; Escape closes it without running the action.
    await expect(dialog.locator(':focus')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(row).toHaveCount(1)

    await row.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(rowWith(page, title)).toHaveCount(0)
    await expectToast(page, 'Deleted')
  })

  test('runs a bulk action on the selected rows', async ({ page }) => {
    const prefix = uniqueTitle('Bulk')
    await createPost(page, `${prefix} one`)
    await createPost(page, `${prefix} two`)

    await page.goto('/admin/posts')
    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(prefix)
    const table = page.getByRole('table')
    await expect(table.locator('tbody').getByRole('row')).toHaveCount(2)

    await page.getByRole('checkbox', { name: 'Select page', exact: true }).check()
    await expect(page.getByText('2 selected')).toBeVisible()

    // The bulk bar: the "n selected" counter with the table's bulk actions beside it.
    const bulkBar = page
      .getByText('2 selected')
      .locator('xpath=ancestor::*[.//button[normalize-space()="Delete"]][1]')
    await bulkBar.getByRole('button', { name: 'Delete', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click()

    await expectToast(page, 'Deleted')
    await expect(table.locator('tbody').getByRole('row').filter({ hasText: prefix })).toHaveCount(0)
  })
})
