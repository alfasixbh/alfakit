import { expect, test } from '@playwright/test'
import { credentials } from '../fixtures/credentials'

// Runs without the stored session: the login page must work from a clean browser.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('login', () => {
  test('rejects wrong credentials with a field error and signs in with the right ones', async ({
    page,
  }) => {
    await page.goto('/admin/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()

    await page.getByLabel(/email/i).fill(credentials.email)
    await page.getByLabel(/^password/i).fill('definitely-wrong')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByRole('alert').first()).toBeVisible()
    await expect(page).toHaveURL(/\/admin\/login/)

    await page.getByLabel(/^password/i).fill(credentials.password)
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL(/\/admin(\/)?$/)
    await expect(page.locator('[data-slot="topbar"]')).toBeVisible()
  })

  test('redirects guests to the login page', async ({ page }) => {
    await page.goto('/admin/posts')
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})
