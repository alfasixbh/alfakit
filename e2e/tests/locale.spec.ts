import { expect, test, type Page } from '@playwright/test'

/** Opens the user menu, then its "Language" submenu, and picks the locale with `lang`. */
async function switchLocale(page: Page, lang: string) {
  await page.getByRole('button', { name: /Alfa Admin/ }).click()
  await page.locator('[role="menuitem"][aria-haspopup="menu"]').first().hover()
  const option = page.getByRole('menuitemradio').filter({ has: page.locator(`[lang="${lang}"]`) })
  await expect(option).toBeVisible()
  await option.click()
}

test.describe('locale', () => {
  test('switches to an RTL locale and back', async ({ page }) => {
    await page.goto('/admin')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('dir', 'ltr')
    await expect(html).toHaveAttribute('lang', /^en/)

    try {
      await switchLocale(page, 'ar')
      await expect(html).toHaveAttribute('dir', 'rtl')
      await expect(html).toHaveAttribute('lang', /^ar/)
      // The panel re-renders its own strings in Arabic (sidebar toggle label).
      await expect(page.getByRole('button', { name: 'Toggle sidebar', exact: true })).toHaveCount(0)
      await expect(page.locator('[data-slot="topbar"]')).toBeVisible()
    } finally {
      await switchLocale(page, 'en')
      await expect(html).toHaveAttribute('dir', 'ltr')
      await expect(html).toHaveAttribute('lang', /^en/)
    }
  })
})
