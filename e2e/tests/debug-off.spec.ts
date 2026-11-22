import { execFileSync } from 'node:child_process'
import { createPost, toasts, uniqueTitle } from '../fixtures/panel'
import { expect, test } from '../fixtures/test'

/**
 * Error notifications as in production (docs: panels/configuration, "Error notifications"):
 * with `app.debug` off, a page visit or action that fails shows a translated notification
 * instead of Inertia's full-screen error modal, and nothing of the exception reaches the
 * browser.
 *
 * Needs sites that run with `APP_DEBUG=false`: `E2E_DEBUG_OFF=1 scripts/e2e-local.sh debug-off`
 * starts them on ports of their own, so it only runs with `E2E_DEBUG_OFF=1`.
 */

test.describe('error notifications with debug mode off', () => {
  test.skip(!process.env.E2E_DEBUG_OFF, 'set E2E_DEBUG_OFF=1 (sites with APP_DEBUG=false) to run')

  test('an action that throws shows "Something went wrong" and leaks nothing', async ({ page }) => {
    const bodies: string[] = []

    page.on('response', async (response) => {
      if (response.status() >= 500) bodies.push(await response.text().catch(() => ''))
    })

    await page.goto('/admin/showcase/actions')
    await page.getByRole('button', { name: 'Server error', exact: true }).click()

    const dialog = page.getByRole('dialog').last()

    await expect(dialog.getByRole('textbox', { name: 'Reason' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Submit', exact: true }).click()

    const toast = toasts(page).first()

    await expect(toast).toBeVisible()
    await expect(toast).toContainText('Something went wrong')

    // No full-screen error modal (Inertia shows the response in an iframe), and the
    // exception stays on the server.
    await expect(page.locator('iframe')).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText(
      /Boom|RuntimeException|ShowcaseActions\.php/,
    )
    expect(bodies.length).toBeGreaterThan(0)

    for (const body of bodies) {
      expect(body).not.toMatch(
        /Boom: a deliberate|RuntimeException|ShowcaseActions\.php|vendor\/laravel/,
      )
    }

    // The page still works: the modal can be closed and another action runs.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page).toHaveURL(/\/admin\/showcase\/actions$/)
  })

  test('a visit to a record that is gone shows "Not found" and stays on the page', async ({
    page,
  }, info) => {
    const title = uniqueTitle('Gone post')

    await createPost(page, title)
    await page.goto(`/admin/posts?search=${encodeURIComponent(title)}`)

    const link = page.getByRole('row').filter({ hasText: title }).getByRole('link').first()

    await expect(link).toBeVisible()

    // Somebody else deletes it for good while the list is open.
    execFileSync(
      'php',
      [
        'artisan',
        'tinker',
        `--execute=\\App\\Models\\Post::withTrashed()->where('title', '${title}')->get()->each->forceDelete();`,
      ],
      { cwd: `../playground/${info.project.name}`, encoding: 'utf8' },
    )

    await link.click()

    const toast = toasts(page).first()

    await expect(toast).toBeVisible()
    await expect(toast).toContainText('Not found')
    await expect(page.locator('iframe')).toHaveCount(0)
    await expect(page).toHaveURL(/\/admin\/posts\?/)
  })
})
