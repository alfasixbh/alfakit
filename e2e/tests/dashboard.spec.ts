import { expect, test } from '@playwright/test'

test.describe('dashboard', () => {
  test('renders the panel shell, widgets and the sidebar navigation', async ({ page }) => {
    await page.goto('/admin')

    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
    await expect(page.locator('[data-slot="topbar"]')).toBeVisible()
    await expect(page.locator('[data-slot="content"]')).toBeVisible()

    // Stats widget from the playground (BlogStats).
    await expect(page.getByText('Users', { exact: true })).toBeVisible()
    await expect(page.getByText('1,024')).toBeVisible()

    // The sidebar is a named navigation landmark with the resource links.
    const nav = page.getByRole('navigation', { name: 'Sidebar', exact: true })
    await expect(nav).toBeVisible()
    await nav.getByRole('link', { name: 'Posts', exact: true }).click()

    await expect(page).toHaveURL(/\/admin\/posts$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Posts' })).toBeVisible()
  })
})
