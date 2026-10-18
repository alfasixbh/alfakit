import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { expectToast, pickOption, uniqueTitle } from '../fixtures/panel'

const cover = fileURLToPath(new URL('../fixtures/cover.png', import.meta.url))

test.describe('post form', () => {
  test('shows validation errors, then creates the post', async ({ page }) => {
    await page.goto('/admin/posts/create')
    await expect(page.getByRole('heading', { level: 1, name: 'Create post' })).toBeVisible()

    await page.getByRole('button', { name: 'Create', exact: true }).click()

    // Server-side validation: the field is marked invalid and the message is announced.
    const titleInput = page.getByRole('textbox', { name: 'Title' })
    await expect(titleInput).toHaveAttribute('aria-invalid', 'true')
    const alerts = page.getByRole('alert').filter({ hasText: /title/i })
    await expect(alerts.first()).toBeVisible()
    await expect(page).toHaveURL(/\/admin\/posts\/create$/)

    const title = uniqueTitle('Created in e2e')
    await titleInput.fill(title)
    await titleInput.blur()
    // `live(onBlur)` title: the server fills the slug.
    const slug = page.getByRole('textbox', { name: 'Slug' })
    await expect(slug).toHaveValue(/^created-in-e2e-/)

    await pickOption(page, 'Status', 'Published')
    await pickOption(page, 'Author', /Alfa Admin/)
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    await expectToast(page, 'Created')
    // The playground resource has a view page, so creation lands there.
    await expect(page).toHaveURL(/\/admin\/posts\/\d+$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title)
  })

  test('edits with a live field and uploads a file', async ({ page }) => {
    const title = uniqueTitle('Edited in e2e')
    await page.goto('/admin/posts/create')
    await page.getByRole('textbox', { name: 'Title' }).fill(title)
    await page.getByRole('textbox', { name: 'Title' }).blur()
    await expect(page.getByRole('textbox', { name: 'Slug' })).not.toHaveValue('')
    await pickOption(page, 'Status', 'Draft')
    await pickOption(page, 'Author', /Alfa Admin/)
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expectToast(page, 'Created')
    await expect(page).toHaveURL(/\/admin\/posts\/\d+$/)
    await page.goto(`${new URL(page.url()).pathname}/edit`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title)

    // Live field: `title` is `live(onBlur)`, so leaving it posts a schema refresh to the server
    // (on edit the slug is left alone; on create it is derived, see the test above).
    const slug = await page.getByRole('textbox', { name: 'Slug' }).inputValue()
    const renamed = `${title} renamed`
    const refresh = page.waitForResponse(
      (response) =>
        response.url().includes('/schema/refresh') && response.request().method() === 'POST',
    )
    await page.getByRole('textbox', { name: 'Title' }).fill(renamed)
    await page.getByRole('textbox', { name: 'Title' }).blur()
    expect((await refresh).ok()).toBe(true)
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(renamed)
    await expect(page.getByRole('textbox', { name: 'Slug' })).toHaveValue(slug)
    await page.getByRole('spinbutton', { name: 'Rating' }).fill('4.5')

    // File upload through the hidden input of the FileUpload field; the file goes to the
    // uploads endpoint first and only its key is submitted with the form.
    const upload = page.locator('[data-field="cover_image"]')
    const uploaded = page.waitForResponse(
      (response) => response.url().includes('/uploads') && response.request().method() === 'POST',
    )
    await upload.locator('input[type="file"]').setInputFiles(cover)
    expect((await uploaded).ok()).toBe(true)
    await expect(upload.getByRole('listitem').filter({ hasText: 'cover.png' })).toHaveCount(1)
    // The preview is decorative (`alt=""`): the file name is in the list item.
    await expect(
      upload.getByRole('listitem').filter({ hasText: 'cover.png' }).locator('img'),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expectToast(page, 'Saved')

    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(renamed)
    await expect(page.getByRole('spinbutton', { name: 'Rating' })).toHaveValue('4.5')
    await expect(page.locator('[data-field="cover_image"] img')).toBeVisible()
  })
})
