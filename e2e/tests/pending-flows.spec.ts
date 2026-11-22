import { type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createPost, expectToast, uniqueTitle } from '../fixtures/panel'
import { expect, test } from '../fixtures/test'

/**
 * Docs-driven flows that need a second person or a second factor: a comment mention reaching
 * the mentioned user's bell, reordering media, a team invitation accepted through its mailed
 * link, two-factor authentication with an authenticator app and recovery codes, and the
 * unsaved-changes question.
 *
 * Throwaway users are created with `php artisan tinker` in the playground under test and
 * removed afterwards; they sign in in a browser context of their own, so the sign-in the
 * other specs share is never touched.
 */

const PASSWORD = 'Pending-flows-1!'

const playground = (renderer: string): string => `../playground/${renderer}`

function artisan(renderer: string, arguments_: string[], baseURL?: string): string {
  return execFileSync('php', ['artisan', ...arguments_], {
    cwd: playground(renderer),
    encoding: 'utf8',
    // Links built on the command line (queued mail) point at the server under test.
    env: { ...process.env, ...(baseURL ? { APP_URL: baseURL } : {}) },
  })
}

const tinker = (renderer: string, code: string, baseURL?: string): string =>
  artisan(renderer, ['tinker', `--execute=${code}`], baseURL)

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

/** A signed-out browser context with the tooling overlays hidden, as `fixtures/test` does. */
async function guestContext(
  browser: Browser,
  baseURL: string | undefined,
): Promise<BrowserContext> {
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

async function signIn(page: Page, email: string, panel = 'admin'): Promise<void> {
  await page.goto(`/${panel}/login`)
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/^password/i).fill(PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
}

/** Sign out through the user menu, as a person does. */
async function signOut(page: Page, user: RegExp): Promise<void> {
  await page.goto('/admin')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: user }).click()
  await page.getByRole('menuitem', { name: /sign out|log out/i }).click()
  await expect(page).toHaveURL(/\/admin\/login/)
}

const dialog = (page: Page, name?: string | RegExp) =>
  name ? page.getByRole('dialog', { name }) : page.getByRole('dialog').last()

const field = (page: Page, label: string) =>
  page
    .locator('[data-slot="field"]')
    .filter({ has: page.getByText(label, { exact: true }) })
    .first()

async function deletePost(page: Page, edit: string): Promise<void> {
  await page.goto(edit)
  await page
    .locator('[data-slot="page-header"]')
    .getByRole('button', { name: 'Delete', exact: true })
    .click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/posts(\?.*)?$/)
}

// ---------------------------------------------------------------- TOTP (RFC 6238)

function base32Decode(key: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''

  for (const char of key.replace(/[\s=-]/g, '').toUpperCase()) {
    const value = alphabet.indexOf(char)

    if (value === -1) throw new Error(`"${char}" is not base32`)

    bits += value.toString(2).padStart(5, '0')
  }

  const bytes: number[] = []

  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2))
  }

  return Buffer.from(bytes)
}

/** HMAC-SHA1, 6 digits, 30-second steps: what authenticator apps compute. */
function totp(key: string, at = Date.now()): string {
  const counter = Buffer.alloc(8)

  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)))

  const hash = createHmac('sha1', base32Decode(key)).update(counter).digest()
  const offset = (hash[hash.length - 1] ?? 0) & 0x0f
  const binary =
    (((hash[offset] ?? 0) & 0x7f) << 24) |
    ((hash[offset + 1] ?? 0) << 16) |
    ((hash[offset + 2] ?? 0) << 8) |
    (hash[offset + 3] ?? 0)

  return (binary % 1_000_000).toString().padStart(6, '0')
}

/** Type a code; the form may submit by itself once the last digit is in. */
async function enterCode(scope: Locator, code: string): Promise<void> {
  await scope.getByRole('textbox', { name: 'Code' }).fill(code)
  await scope
    .getByRole('button', { name: 'Confirm', exact: true })
    .click({ timeout: 2000 })
    .catch(() => undefined)
}

/** A code that was not used yet: a code is accepted once, so wait for the next step. */
async function freshCode(page: Page, key: string, used: string[]): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const code = totp(key)

    if (!used.includes(code)) {
      used.push(code)

      return code
    }

    await page.waitForTimeout(1000)
  }

  throw new Error('no fresh code within 40 seconds')
}

test.describe('comments: mentions (docs: plugins/comments)', () => {
  test('a mentioned user finds the mention in their notifications', async ({
    page,
    browser,
    baseURL,
  }, info) => {
    const renderer = info.project.name
    const token = Date.now().toString(36)
    // One word, so the search behind `@` finds exactly this user.
    const name = `Mona${token} Mention`
    const email = `mention-${token}@example.com`

    createUser(renderer, name, email)

    try {
      const title = uniqueTitle('Mentioned in')

      await createPost(page, title)
      await expect(page).toHaveURL(/\/admin\/posts\/\d+$/)

      const view = new URL(page.url()).pathname
      const thread = page.locator('[data-slot="content"]')

      await thread.getByRole('button', { name: 'Add comment', exact: true }).first().click()
      await dialog(page, 'Add comment').getByRole('textbox').click()
      // `@` opens the suggestions; the search runs over name and e-mail.
      await page.keyboard.type(`Please review @Mona${token}`, { delay: 30 })

      const suggestions = page.getByRole('listbox', { name: 'Suggestions', exact: true })

      await expect(suggestions.getByRole('option', { name: `@${name}`, exact: true })).toBeVisible()
      await suggestions.getByRole('option', { name: `@${name}`, exact: true }).click()
      await expect(
        dialog(page, 'Add comment').locator('[data-type="mention"]', { hasText: `@${name}` }),
      ).toBeVisible()
      await dialog(page, 'Add comment')
        .getByRole('button', { name: 'Comment', exact: true })
        .click()
      await expect(thread.getByText(`@${name}`)).toBeVisible()

      // The mentioned user signs in and finds it under the bell, with a link to the record.
      const context = await guestContext(browser, baseURL)
      const theirs = await context.newPage()

      await signIn(theirs, email)
      await expect(theirs).toHaveURL(/\/admin(\/)?$/)

      const bell = theirs.getByRole('button', { name: 'Notifications', exact: true })

      await expect(bell).toContainText('1')
      await bell.click()

      const panel = theirs.getByRole('dialog', { name: 'Notifications' })

      await expect(panel).toContainText('Alfa Admin mentioned you in a comment')
      await panel.getByRole('button', { name: 'View', exact: true }).first().click()
      await expect(theirs).toHaveURL(new RegExp(`${view}$`))
      await expect(theirs.locator('[data-slot="content"]').getByText(`@${name}`)).toBeVisible()
      await context.close()

      await deletePost(page, `${view}/edit`)
    } finally {
      deleteUser(renderer, email)
    }
  })
})

test.describe('media library: order (docs: plugins/media-library)', () => {
  test('two uploaded images are reordered and the order is kept', async ({ page }) => {
    const title = uniqueTitle('Ordered media')
    const image = readFileSync('fixtures/cover.png')

    await createPost(page, title)
    await expect(page).toHaveURL(/\/admin\/posts\/\d+$/)

    const view = new URL(page.url()).pathname

    await page.goto(`${view}/edit`)

    const gallery = field(page, 'Gallery')

    await gallery.locator('input[type="file"]').setInputFiles([
      { name: 'first.png', mimeType: 'image/png', buffer: image },
      { name: 'second.png', mimeType: 'image/png', buffer: image },
    ])
    await expect(gallery.getByText('first.png')).toBeVisible()
    await expect(gallery.getByText('second.png')).toBeVisible()
    await expect(gallery.getByRole('progressbar')).toHaveCount(0)
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expectToast(page, 'Saved')

    const names = async (): Promise<string[]> => {
      const text = await field(page, 'Gallery').getByRole('listitem').allInnerTexts()

      return text.map((item) => (/first\.png|second\.png/.exec(item) ?? [''])[0]).filter(Boolean)
    }

    await page.goto(`${view}/edit`)
    await expect.poll(names).toEqual(['first.png', 'second.png'])

    // Drag the second file onto the first.
    const items = field(page, 'Gallery').getByRole('listitem')

    await items.filter({ hasText: 'second.png' }).dragTo(items.filter({ hasText: 'first.png' }))
    await expect.poll(names).toEqual(['second.png', 'first.png'])
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expectToast(page, 'Saved')

    // Kept after a reload.
    await page.goto(`${view}/edit`)
    await expect.poll(names).toEqual(['second.png', 'first.png'])

    await deletePost(page, `${view}/edit`)
  })
})

test.describe('teams: invitations (docs: plugins/teams, panels/tenancy)', () => {
  test('an invited user accepts through the mailed link and joins the team', async ({
    page,
    browser,
    baseURL,
  }, info) => {
    test.setTimeout(120_000)

    const renderer = info.project.name
    const token = Date.now().toString(36)
    const team = `E2E Invite ${token}`
    const email = `invitee-${token}@example.com`

    createUser(renderer, `Ivy Invitee ${token}`, email)

    try {
      // The tenant registration page of the panel: the creator lands in the new team.
      await page.goto('/team/new')
      await page.getByRole('textbox', { name: 'Team name', exact: true }).fill(team)
      await page.getByRole('textbox', { name: 'Team name', exact: true }).blur()
      await expect(page.getByRole('textbox', { name: 'URL', exact: true })).not.toHaveValue('')
      await page.getByRole('button', { name: 'Create team', exact: true }).click()
      await expect(page).toHaveURL(/\/team\/e2e-invite-[a-z0-9-]+/)

      const base = new URL(page.url()).pathname.split('/').slice(0, 3).join('/')

      await page.goto(`${base}/team/members`)
      await page.getByRole('button', { name: 'Invite member', exact: true }).first().click()
      await dialog(page, 'Invite a member')
        .getByRole('textbox', { name: 'E-mail address' })
        .fill(email)
      await dialog(page, 'Invite a member')
        .getByRole('radio', { name: 'Viewer', exact: true })
        .check()
      await dialog(page, 'Invite a member')
        .getByRole('button', { name: 'Send invitation', exact: true })
        .click()
      await expect(dialog(page, 'Invite a member')).toBeHidden()

      // The invitation is a queued mail: run the queue, then read the link from the mail
      // the `log` mailer wrote.
      artisan(renderer, ['queue:work', '--stop-when-empty', '--quiet'], baseURL)

      const log = readFileSync(`${playground(renderer)}/storage/logs/laravel.log`, 'utf8')
        // Quoted-printable soft line breaks and `=3D`.
        .replace(/=\r?\n/g, '')
        .replace(/=3D/g, '=')
        .replace(/&amp;/g, '&')
      const links = [
        ...log.matchAll(/https?:\/\/[^\s"'<>)\]]*\/team-invitations\/[^\s"'<>)\]]+/g),
      ].map((match) => match[0])
      const link = links.at(-1)

      expect(link, 'the invitation mail holds a link').toBeTruthy()

      const invitation = new URL(link ?? '')

      // The invited user opens the link, signs in when asked, and accepts.
      const context = await guestContext(browser, baseURL)
      const theirs = await context.newPage()

      await signIn(theirs, email, 'team')
      await theirs.waitForLoadState('networkidle')
      await theirs.goto(`${invitation.pathname}${invitation.search}`)
      await expect(theirs.locator('body')).toContainText(team)
      await theirs
        .getByRole('button', { name: /accept/i })
        .first()
        .click()
      await expect(theirs).toHaveURL(new RegExp(`${base}(/|$)`))
      await context.close()

      // The owner sees the new member with the invited role, and no pending invitation.
      await page.goto(`${base}/team/members`)
      await expect(page.getByRole('row').filter({ hasText: email })).toContainText('Viewer')
      await page.goto(`${base}/team/invitations`)
      await expect(page.getByRole('row').filter({ hasText: email })).toHaveCount(0)

      // Remove the team again.
      await page.goto(`${base}/profile`)
      await page.getByRole('button', { name: 'Delete team', exact: true }).click()

      const confirm = dialog(page, new RegExp(`Delete ${team}`))

      await confirm.getByRole('textbox').fill(team)
      await confirm
        .getByRole('button', { name: /^Delete/ })
        .last()
        .click()
      await expect(page).not.toHaveURL(new RegExp(`${base}(/|$)`))
    } finally {
      deleteUser(renderer, email)
    }
  })
})

test.describe('two-factor authentication (docs: panels/multi-factor-authentication)', () => {
  test('an authenticator app is set up, asked for at sign-in, and turned off', async ({
    browser,
    baseURL,
  }, info) => {
    test.setTimeout(180_000)

    const renderer = info.project.name
    const token = Date.now().toString(36)
    const email = `mfa-${token}@example.com`
    const used: string[] = []

    createUser(renderer, `Mia Factor ${token}`, email)

    const context = await guestContext(browser, baseURL)
    const page = await context.newPage()

    try {
      await signIn(page, email)
      await expect(page).toHaveURL(/\/admin(\/)?$/)

      // Set up: the profile shows the key; the app's code confirms it.
      await page.goto('/admin/profile')
      await expect(page.getByRole('heading', { level: 2, name: 'Authenticator app' })).toBeVisible()
      await page.getByRole('button', { name: 'Set up', exact: true }).first().click()

      const setup = dialog(page, 'Set up an authenticator app')

      await expect(setup.getByRole('img', { name: /QR code/ })).toBeVisible()

      const key = (await setup.locator('code').first().innerText()).replace(/\s/g, '')

      expect(key).toMatch(/^[A-Z2-7]{16,}$/)

      // A wrong code is refused.
      await enterCode(setup, '000000')
      await expect(setup.locator('[aria-invalid="true"]').first()).toBeVisible()

      await enterCode(setup, await freshCode(page, key, used))
      await expect(setup).toBeHidden()

      const app = page.locator('body')

      await expect(app).toContainText('Enabled')

      // Recovery codes are shown once, to be stored.
      await expect(page.getByRole('heading', { name: 'Your recovery codes' })).toBeVisible()

      const recovery = await page.getByRole('listitem').locator('code').allInnerTexts()

      expect(recovery.length).toBeGreaterThanOrEqual(8)
      await page.getByRole('button', { name: 'I have saved them', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Your recovery codes' })).toHaveCount(0)

      // Signing in again asks for the code after the password.
      await signOut(page, /Mia Factor/)
      await signIn(page, email)
      await expect(page).toHaveURL(/\/admin\/multi-factor-challenge/)
      await expect(page.getByRole('heading', { level: 1, name: 'Verify it is you' })).toBeVisible()

      // A wrong code keeps the user out.
      await page.getByRole('textbox', { name: 'Code' }).fill('000000')
      await page
        .getByRole('button', { name: 'Verify', exact: true })
        .click({ timeout: 2000 })
        .catch(() => undefined)
      await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible()
      await expect(page).toHaveURL(/\/admin\/multi-factor-challenge/)

      await page.getByRole('textbox', { name: 'Code' }).fill(await freshCode(page, key, used))
      await page
        .getByRole('button', { name: 'Verify', exact: true })
        .click({ timeout: 2000 })
        .catch(() => undefined)
      await expect(page).toHaveURL(/\/admin(\/)?$/)

      // A recovery code signs in once, without the app.
      await signOut(page, /Mia Factor/)
      await signIn(page, email)
      await expect(page).toHaveURL(/\/admin\/multi-factor-challenge/)
      await page.getByRole('link', { name: 'Use a recovery code', exact: true }).click()
      await expect(page).toHaveURL(/\/multi-factor-challenge\/recovery/)
      await page
        .getByRole('textbox')
        .first()
        .fill(recovery[0] ?? '')
      await page
        .getByRole('button', { name: 'Verify', exact: true })
        .click({ timeout: 2000 })
        .catch(() => undefined)
      await expect(page).toHaveURL(/\/admin(\/)?$/)
      await page.goto('/admin/profile')
      await expect(page.locator('body')).toContainText(
        `${recovery.length - 1} recovery codes left.`,
      )

      // Turn it off again.
      await page.getByRole('button', { name: 'Remove', exact: true }).first().click()
      const remove = dialog(page, 'Remove the authenticator app?')

      // The password is asked for, and a wrong one is refused.
      await remove.getByRole('textbox', { name: 'Current password' }).fill('not-the-password')
      await remove.getByRole('button', { name: 'Remove', exact: true }).click()
      await expect(remove.locator('[aria-invalid="true"]').first()).toBeVisible()
      await remove.getByRole('textbox', { name: 'Current password' }).fill(PASSWORD)
      await remove.getByRole('button', { name: 'Remove', exact: true }).click()
      await expect(remove).toBeHidden()
      await expect(page.locator('body')).toContainText('Not set up')

      // And the next sign-in needs the password only.
      await signOut(page, /Mia Factor/)
      await signIn(page, email)
      await expect(page).toHaveURL(/\/admin(\/)?$/)
    } finally {
      await context.close()
      deleteUser(renderer, email)
    }
  })
})

test.describe('unsaved changes (docs: panels/configuration)', () => {
  test('leaving a changed form asks first, and an unchanged one does not', async ({ page }) => {
    const questions: string[] = []
    let answer: 'accept' | 'dismiss' = 'dismiss'

    page.on('dialog', (question) => {
      questions.push(question.message())
      void (answer === 'accept' ? question.accept() : question.dismiss())
    })

    const tags = page
      .getByRole('navigation', { name: 'Sidebar', exact: true })
      .getByRole('link', { name: 'Tags', exact: true })

    // Unchanged: no question.
    await page.goto('/alerts/benchmark-records/create')
    await expect(page.getByRole('textbox', { name: 'Sku' })).toBeVisible()
    await tags.click()
    await expect(page).toHaveURL(/\/alerts\/tags$/)
    expect(questions).toEqual([])

    // Changed: staying keeps the page and what was typed.
    await page.goto('/alerts/benchmark-records/create')
    await page.getByRole('textbox', { name: 'Sku' }).fill('UNSAVED-1')
    await tags.click()
    await expect.poll(() => questions.length).toBe(1)
    expect(questions[0]).toMatch(/unsaved changes/i)
    await expect(page).toHaveURL(/\/alerts\/benchmark-records\/create$/)
    await expect(page.getByRole('textbox', { name: 'Sku' })).toHaveValue('UNSAVED-1')

    // Changed: leaving anyway goes.
    answer = 'accept'
    await tags.click()
    await expect(page).toHaveURL(/\/alerts\/tags$/)
    expect(questions).toHaveLength(2)
  })
})
