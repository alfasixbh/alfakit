import { expect, type Locator, type Page } from '@playwright/test'

/** The sonner toaster used by all three renderers. */
export const toasts = (page: Page): Locator => page.locator('[data-sonner-toast]')

export async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  await expect(toasts(page).filter({ hasText: text }).first()).toBeVisible()
}

/** Picks an option in a non-native Alfakit `Select` (shadcn select or searchable combobox). */
export async function pickOption(page: Page, field: string | RegExp, option: string | RegExp) {
  await page.getByRole('combobox', { name: field, exact: true }).click()
  await page.getByRole('option', { name: option }).first().click()
}

/** Creates a draft post through the UI; ends on the record's view page. */
export async function createPost(page: Page, title: string): Promise<void> {
  await page.goto('/admin/posts/create')
  await page.getByRole('textbox', { name: 'Title' }).fill(title)
  // `live(onBlur)` title → slug on the server; wait for the refresh to land.
  await page.getByRole('textbox', { name: 'Title' }).blur()
  await expect(page.getByRole('textbox', { name: 'Slug' })).not.toHaveValue('')
  await pickOption(page, 'Status', 'Draft')
  await pickOption(page, 'Author', /Alfa Admin/)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expectToast(page, 'Created')
}

/** A unique, searchable title for records created by a test. */
export const uniqueTitle = (prefix: string): string =>
  `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** The table row whose text includes `text`. */
export const rowWith = (page: Page, text: string): Locator =>
  page.getByRole('row').filter({ hasText: text })
