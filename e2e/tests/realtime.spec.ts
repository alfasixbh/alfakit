import { type Browser, type BrowserContext, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { createPost, expectToast, rowWith, uniqueTitle } from '../fixtures/panel'
import { expect, test } from '../fixtures/test'

/**
 * Real-time collaboration (docs: panels/realtime). Needs, per playground, a Reverb server, a
 * queue worker and the site started with `ALFAKIT_REALTIME=1 BROADCAST_CONNECTION=reverb`
 * (`E2E_REALTIME=1 scripts/e2e-local.sh realtime` does all of it), so it only runs with
 * `E2E_REALTIME=1`.
 *
 * Two people are needed: the stored admin session and a throwaway user in a browser context
 * of their own, created with `php artisan tinker` in the playground under test.
 */
const PASSWORD = 'realtime-e2e-password'

const realtimeEnv = { ALFAKIT_REALTIME: '1', BROADCAST_CONNECTION: 'reverb' }

function tinker(renderer: string, code: string): string {
  return execFileSync('php', ['artisan', 'tinker', `--execute=${code}`], {
    cwd: `../playground/${renderer}`,
    encoding: 'utf8',
    // The command line broadcasts like the site does.
    env: { ...process.env, ...realtimeEnv },
  })
}

function createUser(renderer: string, name: string, email: string): void {
  tinker(
    renderer,
    `$user = \\App\\Models\\User::query()->create(['name' => '${name}', 'email' => '${email}', 'password' => \\Illuminate\\Support\\Facades\\Hash::make('${PASSWORD}')]); $user->forceFill(['email_verified_at' => now()])->save();`,
  )
}

function deleteUser(renderer: string, email: string): void {
  tinker(
    renderer,
    `$user = \\App\\Models\\User::query()->where('email', '${email}')->first(); if ($user) { \\Illuminate\\Support\\Facades\\DB::table('notifications')->where('notifiable_id', $user->getKey())->where('notifiable_type', $user->getMorphClass())->delete(); $user->delete(); }`,
  )
}

async function contextFor(browser: Browser, baseURL: string | undefined): Promise<BrowserContext> {
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } })

  await context.addInitScript(() => {
    const hide = () => {
      const style = document.createElement('style')
      style.textContent =
        '#herd-ai-host { display: none !important; pointer-events: none !important; }'
      document.documentElement.appendChild(style)
    }

    if (document.documentElement) hide()
    else document.addEventListener('DOMContentLoaded', hide)
  })

  return context
}

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/^password/i).fill(PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/admin(\/)?$/)
}

/** Resolves once the page's Echo has joined its channels (the WebSocket is open). */
async function connected(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const echo = (
            window as unknown as {
              Echo?: { connector?: { pusher?: { connection?: { state?: string } } } }
            }
          ).Echo

          return echo?.connector?.pusher?.connection?.state ?? 'none'
        }),
      { timeout: 15_000 },
    )
    .toBe('connected')
}

async function authorise(page: Page, channel: string): Promise<number> {
  const token = await page.evaluate(() => {
    const cookie = document.cookie.split('; ').find((row) => row.startsWith('XSRF-TOKEN='))

    return cookie ? decodeURIComponent(cookie.split('=')[1] ?? '') : ''
  })
  const response = await page.request.post('/admin/_alfakit/broadcasting/auth', {
    form: { socket_id: '1234.5678', channel_name: channel },
    headers: {
      'X-XSRF-TOKEN': token,
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })

  return response.status()
}

test.describe('real-time collaboration (docs: panels/realtime)', () => {
  test.skip(
    !process.env.E2E_REALTIME,
    'set E2E_REALTIME=1 (with Reverb and a queue worker running) to run',
  )

  let renderer = ''
  let email = ''
  let name = ''
  let other: BrowserContext
  let otherPage: Page

  test.beforeEach(async ({ browser, baseURL }, info) => {
    renderer = info.project.name
    name = `Realtime ${Date.now().toString(36)}`
    email = `realtime-${Date.now().toString(36)}@example.com`
    createUser(renderer, name, email)
    other = await contextFor(browser, baseURL)
    otherPage = await other.newPage()
    await signIn(otherPage, email)
  })

  test.afterEach(async () => {
    await other.close()
    deleteUser(renderer, email)
  })

  test('a live table follows what another user creates, renames and deletes', async ({ page }) => {
    const tag = uniqueTitle('Live tag')

    await page.goto('/admin/tags')
    await connected(page)
    await expect(rowWith(page, tag)).toHaveCount(0)

    // The other user creates a record (tags are managed in modals): a "new records" pill
    // appears here, and nothing jumps.
    await otherPage.goto('/admin/tags')
    await otherPage
      .locator('[data-slot="page-header"]')
      .getByRole('button', { name: /new|create/i })
      .first()
      .click()

    const createDialog = otherPage.getByRole('dialog').last()

    await createDialog.getByRole('textbox', { name: 'Name' }).fill(tag)
    await createDialog.getByRole('button', { name: /^create$/i }).click()
    await expectToast(otherPage, 'Created')

    const pill = page.getByRole('button', { name: /new record/i })

    await expect(pill.first()).toBeVisible({ timeout: 15_000 })
    await pill.first().click()
    await expect(rowWith(page, tag)).toHaveCount(1)

    // An update of a listed record refreshes the row in place.
    const renamed = `${tag} renamed`

    await otherPage.getByRole('searchbox', { name: 'Search', exact: true }).fill(tag)
    await expect(rowWith(otherPage, tag)).toHaveCount(1)
    await rowWith(otherPage, tag).getByRole('button', { name: 'Edit', exact: true }).click()

    const editDialog = otherPage.getByRole('dialog').last()

    await editDialog.getByRole('textbox', { name: 'Name' }).fill(renamed)
    await editDialog.getByRole('button', { name: /save/i }).click()
    await expectToast(otherPage, /saved/i)

    await expect(rowWith(page, renamed)).toHaveCount(1, { timeout: 15_000 })

    // And a delete removes it, all without a reload of this page.
    await expect(rowWith(otherPage, renamed)).toHaveCount(1)
    await rowWith(otherPage, renamed).getByRole('button', { name: 'Delete', exact: true }).click()
    await otherPage
      .getByRole('dialog')
      .last()
      .getByRole('button', { name: 'Delete', exact: true })
      .click()
    await expectToast(otherPage, 'Deleted')

    await expect(rowWith(page, renamed)).toHaveCount(0, { timeout: 15_000 })
  })

  test('an edit page shows who else is on the record and when they save it', async ({ page }) => {
    const title = uniqueTitle('Shared post')

    await createPost(page, title)
    await page.getByRole('link', { name: 'Edit', exact: true }).first().click()
    await expect(page).toHaveURL(/\/admin\/posts\/\d+\/edit/)

    const edit = new URL(page.url()).pathname

    await connected(page)

    // Presence: the other user opens the same record.
    await otherPage.goto(edit)

    const presence = page.locator('[data-slot="presence"]')

    await expect(presence).toBeVisible({ timeout: 15_000 })
    await expect(presence.getByRole('list', { name: 'Also on this record' })).toContainText(
      new RegExp(`${name} is editing`),
    )

    // They see the admin too.
    await expect(otherPage.locator('[data-slot="presence"]')).toContainText(
      /Alfa Admin is editing/,
      { timeout: 15_000 },
    )

    // The other user saves: a banner says so here, and nothing is blocked.
    await otherPage.getByRole('textbox', { name: 'Title' }).fill(`${title} (theirs)`)
    await otherPage.getByRole('textbox', { name: 'Title' }).blur()
    await otherPage.getByRole('button', { name: /save/i }).first().click()
    await expectToast(otherPage, /saved/i)

    const banner = page.locator('[data-slot="conflict-banner"]')

    await expect(banner).toBeVisible({ timeout: 15_000 })
    await expect(banner).toContainText(new RegExp(`${name} saved changes`))
    await expect(banner.getByRole('button', { name: 'Review changes', exact: true })).toBeVisible()

    // Reload takes the saved record into the form.
    await banner.getByRole('button', { name: 'Reload', exact: true }).click()
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(`${title} (theirs)`)
    await expect(banner).toHaveCount(0)

    // Leaving the record removes the avatar.
    await otherPage.goto('/admin')
    await expect(page.locator('[data-slot="presence"]')).toHaveCount(0, { timeout: 15_000 })

    await page
      .locator('[data-slot="page-header"]')
      .getByRole('button', { name: 'Delete', exact: true })
      .click()
    await page
      .getByRole('dialog')
      .last()
      .getByRole('button', { name: 'Delete', exact: true })
      .click()
  })

  test('a notification reaches the open page without a reload', async () => {
    await otherPage.goto('/admin')
    await connected(otherPage)

    const bell = otherPage.locator('[data-slot="notifications-trigger"]')

    await expect(bell).toBeVisible()
    await expect(bell).not.toContainText('1')

    // Stored for the user from the command line: the bell follows.
    tinker(
      renderer,
      `\\AlfaSix\\Alfakit\\Notifications\\Notification::make()->title('Realtime hello')->success()->sendToDatabase(\\App\\Models\\User::query()->where('email', '${email}')->firstOrFail());`,
    )

    await expect(bell).toContainText('1', { timeout: 15_000 })

    // A broadcast notification is a toast, right away.
    tinker(
      renderer,
      `\\AlfaSix\\Alfakit\\Notifications\\Notification::make()->title('Realtime toast')->success()->broadcast(\\App\\Models\\User::query()->where('email', '${email}')->firstOrFail());`,
    )

    await expectToast(otherPage, 'Realtime toast')
  })

  test('channels are authorised per user', async ({ page, browser, baseURL }) => {
    await page.goto('/admin/tags')
    await otherPage.goto('/admin')

    // A model both may list.
    expect(await authorise(page, 'private-alfakit.admin._.App-Models-Tag')).toBe(200)
    expect(await authorise(otherPage, 'private-alfakit.admin._.App-Models-Tag')).toBe(200)

    // Roles are for super admins only (Shield): the other user may not follow them.
    expect(
      await authorise(otherPage, 'private-alfakit.admin._.Spatie-Permission-Models-Role'),
    ).toBe(403)

    // Another user's notification channel is refused, one's own is not.
    expect(await authorise(otherPage, 'private-App.Models.User.1')).toBe(403)

    // A model that is no resource of the panel, and a signed-out visitor.
    expect(await authorise(otherPage, 'private-alfakit.admin._.App-Models-Nothing')).toBe(403)

    const guest = await contextFor(browser, baseURL)
    const guestPage = await guest.newPage()

    await guestPage.goto('/admin/login')
    expect([401, 403, 419]).toContain(
      await authorise(guestPage, 'private-alfakit.admin._.App-Models-Tag'),
    )
    await guest.close()
  })
})
