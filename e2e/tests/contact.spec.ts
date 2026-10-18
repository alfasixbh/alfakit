import { expect, test } from '@playwright/test'
import { expectToast, pickOption } from '../fixtures/panel'

// A public page outside the panel: no stored session needed.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('standalone contact form', () => {
  test('validates, reveals a live field and submits', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.getByRole('heading', { name: 'Contact us' })).toBeVisible()

    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByRole('textbox', { name: 'Name' }).fill('Playwright')
    await page.getByRole('textbox', { name: 'Email' }).fill('e2e@example.com')

    // `live()` select: choosing "Support" shows the conditional order number field.
    await expect(page.getByRole('textbox', { name: 'Order number' })).toHaveCount(0)
    await pickOption(page, 'Topic', 'Support')
    await expect(page.getByRole('textbox', { name: 'Order number' })).toBeVisible()
    await page.getByRole('textbox', { name: 'Order number' }).fill('A-1001')
    await page.getByRole('textbox', { name: 'Message' }).fill('Hello from the e2e suite.')

    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    await expectToast(page, 'Thanks Playwright!')
  })
})
