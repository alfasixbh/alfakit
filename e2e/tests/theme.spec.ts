import { expect, test } from '@playwright/test'

test.describe('theme', () => {
  test('switches the panel theme and dark mode', async ({ page }) => {
    await page.goto('/admin')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-alfakit-theme', /alfakit/)

    try {
      // Playground theme picker (a slot in the top bar) stores the choice in the session.
      await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('minimal')
      await expect(html).toHaveAttribute('data-alfakit-theme', /minimal/)
      await expect(page.locator('[data-slot="topbar"]')).toBeVisible()

      // Dark mode toggle from the panel itself.
      await page.getByRole('button', { name: 'Toggle theme', exact: true }).click()
      await page.getByRole('menuitemradio', { name: 'Dark', exact: true }).click()
      await expect(html).toHaveClass(/dark/)
      await page.getByRole('button', { name: 'Toggle theme', exact: true }).click()
      await page.getByRole('menuitemradio', { name: 'Light', exact: true }).click()
      await expect(html).not.toHaveClass(/dark/)
    } finally {
      await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('alfakit')
      await expect(html).toHaveAttribute('data-alfakit-theme', /alfakit/)
    }
  })
})
