import { type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { expect, test } from '../fixtures/test'

/**
 * The second factor by email and what goes with it (docs: panels/multi-factor-authentication),
 * and the unsaved-changes question on modal forms (docs: panels/configuration, actions/modals).
 *
 * Emailed codes are read from the playground's mail log (`MAIL_MAILER=log`). Throwaway users
 * are created with `php artisan tinker` and removed afterwards; they sign in in browser
 * contexts of their own, so the sign-in the other specs share is never touched.
 */

const PASSWORD = 'Rest-auth-1!'
const NEW_PASSWORD = 'Rest-auth-2!'

const playground = (renderer: string): string => `../playground/${renderer}`

const tinker = (renderer: string, code: string): string =>
  execFileSync('php', ['artisan', 'tinker', `--execute=${code}`], {
    cwd: playground(renderer),
    encoding: 'utf8',
  })

function createUser(renderer: string, name: string, email: string): void {
  tinker(
    renderer,
    `$user = \\App\\Models\\User::query()->create(['name' => '${name}', 'email' => '${email}', 'password' => \\Illuminate\\Support\\Facades\\Hash::make('${PASSWORD}')]); $user->forceFill(['email_verified_at' => now()])->save();`,
  )
}

function changePassword(renderer: string, email: string, password: string): void {
  tinker(
    renderer,
    `\\App\\Models\\User::query()->where('email', '${email}')->firstOrFail()->forceFill(['password' => \\Illuminate\\Support\\Facades\\Hash::make('${password}')])->save();`,
  )
}

/**
 * Remove the user. Tinker prints an exception and still exits with 0, and the playground's
 * SQLite file can be locked for a moment by a request that is still finishing: ask until
 * the user is gone.
 */
function deleteUser(renderer: string, email: string): void {
  for (let attempt = 0; attempt < 5; attempt++) {
    const left = tinker(
      renderer,
      `$user = \\App\\Models\\User::query()->where('email', '${email}')->first(); if ($user) { \\Illuminate\\Support\\Facades\\DB::table('notifications')->where('notifiable_id', $user->getKey())->where('notifiable_type', $user->getMorphClass())->delete(); $user->delete(); } echo 'left:'.\\App\\Models\\User::query()->where('email', '${email}')->count();`,
    )

    if (left.includes('left:0')) return
  }

  throw new Error(`the throwaway user ${email} could not be removed`)
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

async function signIn(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/^password/i).fill(password)
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

/** Every code mailed to the address so far, oldest first. */
function mailedCodes(renderer: string, email: string): string[] {
  const log = readFileSync(`${playground(renderer)}/storage/logs/laravel.log`, 'utf8')
  const marker = `To: ${email}`
  const codes: string[] = []
  let at = log.indexOf(marker)

  while (at !== -1) {
    const next = log.indexOf('\nTo: ', at + marker.length)
    const mail = log.slice(at, next === -1 ? undefined : next)
    // The code is a line of its own in the text part of the mail.
    const code = /^\s*(\d{6})\s*$/m.exec(mail)

    if (code?.[1]) codes.push(code[1])

    at = log.indexOf(marker, at + marker.length)
  }

  return codes
}

/** The code of a mail that arrived after `before` codes were already there. */
async function newCode(renderer: string, email: string, before: number): Promise<string> {
  await expect
    .poll(() => mailedCodes(renderer, email).length, {
      message: `a new code is mailed to ${email}`,
      timeout: 15_000,
    })
    .toBeGreaterThan(before)

  return mailedCodes(renderer, email).at(-1) ?? ''
}

/** A six-digit code that is not the right one. */
const wrongCode = (right: string): string => (right === '000000' ? '111111' : '000000')

const dialog = (page: Page, name: string | RegExp) => page.getByRole('dialog', { name })

/** The profile section of a second factor, found by its heading. */
const factorButton = (page: Page, heading: string, button: string): Locator =>
  page
    .getByRole('heading', { name: heading, exact: true })
    .locator(`xpath=ancestor::*[.//button[normalize-space()="${button}"]][1]`)
    .getByRole('button', { name: button, exact: true })
    .first()

/** Type a code and press the button unless the form already submitted itself. */
async function enterCode(scope: Locator | Page, code: string, button: string): Promise<void> {
  await scope.getByRole('textbox', { name: 'Code' }).fill(code)
  await scope
    .getByRole('button', { name: button, exact: true })
    .click({ timeout: 2000 })
    .catch(() => undefined)
}

const CHALLENGE = /\/admin\/multi-factor-challenge/
const HOME = /\/admin(\/)?$/

/** Turn email codes on for the signed-in user, with the code mailed to them. */
async function setUpEmailCodes(page: Page, renderer: string, email: string): Promise<void> {
  await page.goto('/admin/profile')
  await expect(page.getByRole('heading', { name: 'Email codes', exact: true })).toBeVisible()

  const before = mailedCodes(renderer, email).length

  await factorButton(page, 'Email codes', 'Set up').click()

  const setup = dialog(page, 'Set up email codes')

  await expect(setup).toBeVisible()
  // The address the code went to is named, masked.
  await expect(setup).toContainText('@example.com')

  const code = await newCode(renderer, email, before)

  expect(code).toMatch(/^\d{6}$/)

  // A wrong code is refused and nothing is turned on.
  await enterCode(setup, wrongCode(code), 'Confirm')
  await expect(setup.locator('[aria-invalid="true"]').first()).toBeVisible()

  await enterCode(setup, code, 'Confirm')
  await expect(setup).toBeHidden()
  await expect(factorButton(page, 'Email codes', 'Remove')).toBeVisible()
}

test.describe('email codes as a second factor (docs: panels/multi-factor-authentication)', () => {
  test('are set up with a mailed code, asked for at sign-in, and turned off', async ({
    browser,
    baseURL,
  }, info) => {
    test.setTimeout(180_000)

    const renderer = info.project.name
    const token = Date.now().toString(36)
    const email = `mail-code-${token}@example.com`

    createUser(renderer, `Elif Mailcode ${token}`, email)

    const context = await guestContext(browser, baseURL)
    const page = await context.newPage()

    try {
      await signIn(page, email)
      await expect(page).toHaveURL(HOME)

      await setUpEmailCodes(page, renderer, email)

      // Signing in again asks for a code after the password, and mails a new one.
      await signOut(page, /Elif Mailcode/)

      const before = mailedCodes(renderer, email).length

      await signIn(page, email)
      await expect(page).toHaveURL(CHALLENGE)
      await expect(page.getByRole('heading', { level: 1, name: 'Verify it is you' })).toBeVisible()
      await expect(page.locator('body')).toContainText('Enter the code we sent to')

      const code = await newCode(renderer, email, before)

      // The panel is closed until the code is given.
      await page.goto('/admin/posts')
      await expect(page).not.toHaveURL(/\/admin\/posts/)
      await page.goto('/admin/multi-factor-challenge')

      // A wrong code keeps the user out.
      await enterCode(page, wrongCode(code), 'Verify')
      await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible()
      await expect(page).toHaveURL(CHALLENGE)

      // No second mail was sent meanwhile: the first code is still the one.
      expect(mailedCodes(renderer, email)).toHaveLength(before + 1)

      // Signed in, and taken to the page that was asked for before.
      await enterCode(page, code, 'Verify')
      await expect(page).toHaveURL(/\/admin\/posts$/)

      // A used code is not accepted again: the next sign-in gets a code of its own.
      await signOut(page, /Elif Mailcode/)

      const beforeThird = mailedCodes(renderer, email).length

      await signIn(page, email)
      await expect(page).toHaveURL(CHALLENGE)

      const third = await newCode(renderer, email, beforeThird)

      if (third !== code) {
        await enterCode(page, code, 'Verify')
        await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible()
        await expect(page).toHaveURL(CHALLENGE)
      }

      await enterCode(page, third, 'Verify')
      await expect(page).toHaveURL(HOME)

      // Turn it off: the password is asked for, and a wrong one is refused.
      await page.goto('/admin/profile')
      await factorButton(page, 'Email codes', 'Remove').click()

      const remove = dialog(page, 'Stop using email codes?')

      await remove.getByRole('textbox', { name: 'Current password' }).fill('not-the-password')
      await remove.getByRole('button', { name: 'Remove', exact: true }).click()
      await expect(remove.locator('[aria-invalid="true"]').first()).toBeVisible()
      await remove.getByRole('textbox', { name: 'Current password' }).fill(PASSWORD)
      await remove.getByRole('button', { name: 'Remove', exact: true }).click()
      await expect(remove).toBeHidden()
      await expect(factorButton(page, 'Email codes', 'Set up')).toBeVisible()

      // And the next sign-in needs the password only.
      await signOut(page, /Elif Mailcode/)
      await signIn(page, email)
      await expect(page).toHaveURL(HOME)
    } finally {
      await context.close()
      deleteUser(renderer, email)
    }
  })
})

test.describe('trust this device (docs: panels/multi-factor-authentication)', () => {
  test('skips the challenge on that browser only, until the password changes', async ({
    browser,
    baseURL,
  }, info) => {
    test.setTimeout(180_000)

    const renderer = info.project.name
    const token = Date.now().toString(36)
    const email = `trusted-${token}@example.com`
    const name = /Tara Trusted/

    createUser(renderer, `Tara Trusted ${token}`, email)

    const context = await guestContext(browser, baseURL)
    const page = await context.newPage()

    /** Pass the challenge on `target` with the code mailed for it. */
    const pass = async (target: Page, password: string, trust: boolean): Promise<void> => {
      const before = mailedCodes(renderer, email).length

      await signIn(target, email, password)
      await expect(target).toHaveURL(CHALLENGE)

      const code = await newCode(renderer, email, before)
      const checkbox = target.getByRole('checkbox', { name: 'Trust this device for 30 days' })

      await expect(checkbox).toBeVisible()

      // Before the code: the form submits itself once the last digit is in.
      if (trust) await checkbox.check()

      await enterCode(target, code, 'Verify')
      await expect(target).toHaveURL(HOME)
    }

    try {
      await signIn(page, email)
      await expect(page).toHaveURL(HOME)
      await setUpEmailCodes(page, renderer, email)
      await signOut(page, name)

      // Without the tick the next sign-in is challenged again.
      await pass(page, PASSWORD, false)
      await signOut(page, name)
      await pass(page, PASSWORD, true)

      const cookies = await context.cookies()
      const device = cookies.find((cookie) => cookie.name === 'alfakit_mfa_device_admin')

      expect(device, 'the trusted-device cookie is set').toBeTruthy()
      expect(device?.httpOnly).toBe(true)
      // About 30 days from now.
      expect((device?.expires ?? 0) - Date.now() / 1000).toBeGreaterThan(29 * 24 * 3600)

      // Trusted: the password alone signs in, and no code is mailed.
      await signOut(page, name)

      const mailed = mailedCodes(renderer, email).length

      await signIn(page, email)
      await expect(page).toHaveURL(HOME)
      expect(mailedCodes(renderer, email)).toHaveLength(mailed)

      // Another browser is not trusted.
      const other = await guestContext(browser, baseURL)
      const theirs = await other.newPage()

      try {
        await pass(theirs, PASSWORD, false)
      } finally {
        await other.close()
      }

      // A new password ends the trust on the browser that had it.
      await signOut(page, name)
      changePassword(renderer, email, NEW_PASSWORD)
      await pass(page, NEW_PASSWORD, false)
    } finally {
      await context.close()
      deleteUser(renderer, email)
    }
  })
})

test.describe('unsaved changes in a modal form (docs: panels/configuration)', () => {
  test('closing a changed modal asks first, an unchanged one closes at once', async ({ page }) => {
    const questions: string[] = []
    let answer: 'accept' | 'dismiss' = 'dismiss'

    page.on('dialog', (question) => {
      questions.push(question.message())
      void (answer === 'accept' ? question.accept() : question.dismiss())
    })

    const modal = page.getByRole('dialog').last()
    const name = modal.getByRole('textbox', { name: 'Name' })
    const open = async (): Promise<void> => {
      await page
        .locator('[data-slot="page-header"]')
        .getByRole('button', { name: /new tag|create/i })
        .first()
        .click()
      await expect(name).toBeVisible()
    }
    const closers: Record<string, () => Promise<void>> = {
      Escape: () => page.keyboard.press('Escape'),
      'the close button': () => modal.getByRole('button', { name: 'Close', exact: true }).click(),
      Cancel: () => modal.getByRole('button', { name: 'Cancel', exact: true }).click(),
      'a click outside': () => page.mouse.click(5, 5),
    }

    await page.goto('/alerts/tags')
    await page.waitForLoadState('networkidle')

    for (const [how, close] of Object.entries(closers)) {
      // Unchanged: no question.
      questions.length = 0
      await open()
      await close()
      await expect(modal, `unchanged, closed with ${how}`).toBeHidden()
      expect(questions, `unchanged, closed with ${how}`).toEqual([])

      // Changed: staying keeps the modal and what was typed.
      answer = 'dismiss'
      await open()
      await name.fill('Unsaved tag')
      await close()
      await expect.poll(() => questions.length, { message: `changed, ${how} asks` }).toBe(1)
      expect(questions[0]).toBe('You have unsaved changes. Close anyway?')
      await expect(modal, `changed, ${how}, staying`).toBeVisible()
      await expect(name, `changed, ${how}, staying`).toHaveValue('Unsaved tag')

      // Changed: closing anyway closes, and nothing was saved.
      answer = 'accept'
      await close()
      await expect(modal, `changed, ${how}, closing anyway`).toBeHidden()
      expect(questions).toHaveLength(2)
    }

    await expect(page.getByRole('cell', { name: 'Unsaved tag', exact: true })).toHaveCount(0)

    // Leaving the page with a changed modal open asks too.
    questions.length = 0
    answer = 'dismiss'
    await open()
    await name.fill('Unsaved tag')
    // The modal covers the sidebar: the link is clicked from the page itself.
    await page.evaluate(() => {
      for (const link of document.querySelectorAll<HTMLAnchorElement>('nav a[href]')) {
        if (link.pathname.endsWith('/alerts/benchmark-records')) {
          link.click()

          return
        }
      }
    })
    await expect.poll(() => questions.length).toBe(1)
    await expect(page).toHaveURL(/\/alerts\/tags$/)
    await expect(name).toBeVisible()
    await expect(name).toHaveValue('Unsaved tag')

    // Saving is not "closing": no question, and the tag is there.
    questions.length = 0

    const saved = `Saved tag ${Date.now().toString(36)}`

    await name.fill(saved)
    await modal.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(modal).toBeHidden()
    expect(questions).toEqual([])

    const row = page.getByRole('row').filter({ hasText: saved })

    await expect(row).toBeVisible()

    // Editing in a modal: the same question, and the saved value stays when leaving it.
    answer = 'accept'
    await row.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(name).toHaveValue(saved)
    await name.fill(`${saved} changed`)
    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden()
    expect(questions).toEqual(['You have unsaved changes. Close anyway?'])
    await expect(page.getByRole('row').filter({ hasText: saved })).toBeVisible()
    await expect(page.getByText(`${saved} changed`)).toHaveCount(0)

    // Remove the tag again.
    questions.length = 0
    await row.getByRole('button', { name: 'Delete', exact: true }).click()
    await page
      .getByRole('dialog')
      .last()
      .getByRole('button', { name: 'Delete', exact: true })
      .click()
    await expect(page.getByRole('row').filter({ hasText: saved })).toHaveCount(0)
    expect(questions).toEqual([])
  })
})
