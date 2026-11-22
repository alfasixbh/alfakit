import { type Page } from '@playwright/test'
import { expect, test } from '../fixtures/test'

/**
 * Docs-driven checks of what lives outside one panel page: standalone components, the
 * AuthKit pages, every built-in theme (light and dark) and every language of the panel.
 */

function watchErrors(page: Page): string[] {
  const errors: string[] = []

  page.on('pageerror', (error) => errors.push(`page error: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) {
      errors.push(`console: ${message.text().slice(0, 300)}`)
    }
  })
  page.on('response', (response) => {
    if (response.status() >= 500) errors.push(`http ${response.status()}: ${response.url()}`)
  })

  return errors
}

const THEMES = ['neutral', 'alfakit', 'minimal', 'soft', 'corporate', 'filament']
const LOCALES = ['ar', 'de', 'es', 'fa', 'fr', 'it', 'ja', 'nl', 'pt_BR', 'ru', 'tr', 'zh_CN']
const RTL = ['ar', 'fa']

test.describe('standalone components (docs: standalone)', () => {
  test('a standalone table outside the panel lists, searches and sorts', async ({ page }) => {
    const errors = watchErrors(page)

    await page.goto('/posts')
    await expect(page.getByRole('table')).toBeVisible()

    const rows = page.getByRole('row')
    const before = await rows.count()

    expect(before).toBeGreaterThan(1)

    // Sorting by the first sortable column changes `aria-sort`.
    const sortable = page.locator('th[aria-sort]').first()

    if ((await sortable.count()) > 0) {
      await sortable.getByRole('button').first().click()
      await expect(sortable).toHaveAttribute('aria-sort', /ascending|descending/)
    }

    // A search nothing matches shows the empty state instead of rows.
    const search = page.getByRole('searchbox').first()

    if ((await search.count()) > 0) {
      await search.fill('zzzz-no-such-post-zzzz')
      await expect(page.getByRole('row'))
        .toHaveCount(1, { timeout: 10_000 })
        .catch(async () => {
          expect(await page.getByRole('row').count()).toBeLessThan(before)
        })
      await search.fill('')
    }

    expect(errors).toEqual([])
  })
})

test.describe('AuthKit pages (docs: standalone/auth-kit)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  // Only where the playground ran `php artisan alfakit:auth`.
  test.beforeEach(async ({ request }) => {
    const response = await request.get('/kit/login')

    test.skip(response.status() === 404, 'this playground has no AuthKit pages')
  })

  for (const path of ['/kit/login', '/kit/register', '/kit/forgot-password']) {
    test(`${path} renders its form for a guest`, async ({ page }) => {
      const errors = watchErrors(page)

      await page.goto(path)
      await expect(page.getByRole('textbox').first()).toBeVisible()
      await expect(page.getByRole('button').first()).toBeVisible()
      expect(errors).toEqual([])
    })
  }

  test('the AuthKit sign-in rejects wrong credentials with a field error', async ({ page }) => {
    await page.goto('/kit/login')
    await page.getByRole('textbox').first().fill('nobody@example.com')
    await page.locator('input[type="password"]').first().fill('wrong-password')
    await page.locator('input[type="password"]').first().press('Enter')
    await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible()
    await expect(page).toHaveURL(/\/kit\/login/)
  })
})

test.describe('themes (docs: design/themes)', () => {
  test('every built-in theme renders the panel in light and dark', async ({ page }) => {
    test.setTimeout(240_000)

    const failures: Record<string, string[]> = {}
    const html = page.locator('html')

    try {
      for (const theme of THEMES) {
        const errors = watchErrors(page)

        // The playground's theme switch (session only).
        await page.goto(`/demo/theme/${theme}`)
        await page.goto('/admin/posts')
        await expect(html).toHaveAttribute('data-alfakit-theme', new RegExp(theme))
        await expect(page.locator('[data-slot="topbar"]')).toBeVisible()
        await expect(page.getByRole('table')).toBeVisible()

        for (const scheme of ['dark', 'light'] as const) {
          await page.emulateMedia({ colorScheme: scheme })
          await page.goto('/admin/posts/create')
          await expect(page.locator('[data-slot="content"]')).toBeVisible()

          // The page background and text colour are set and differ (a theme that lost its
          // variables renders transparent on transparent).
          const colours = await page.evaluate(() => {
            const style = getComputedStyle(document.body)

            return { background: style.backgroundColor, text: style.color }
          })

          if (colours.background === colours.text || colours.background === 'rgba(0, 0, 0, 0)') {
            errors.push(`${scheme}: body colours ${JSON.stringify(colours)}`)
          }
        }

        if (errors.length > 0) failures[theme] = errors

        page.removeAllListeners('pageerror')
        page.removeAllListeners('console')
        page.removeAllListeners('response')
      }
    } finally {
      await page.emulateMedia({ colorScheme: 'light' })
      await page.goto('/demo/theme/alfakit')
    }

    expect(failures).toEqual({})
  })
})

test.describe('languages (docs: localization)', () => {
  // Changes the signed-in user's language: run on its own, not beside other specs
  // (`E2E_LOCALES=1`).
  test.skip(!process.env.E2E_LOCALES, 'set E2E_LOCALES=1 to run')

  test('every language renders the panel, with the right direction', async ({ page }) => {
    test.setTimeout(300_000)

    const failures: Record<string, string[]> = {}
    const html = page.locator('html')

    await page.goto('/admin')

    const endpoint = await page.evaluate(() => {
      const el = document.getElementById('app')
      const props = el?.dataset.page ? JSON.parse(el.dataset.page).props : null

      return (props?.alfakit?.endpoints?.locale ?? '/admin/_alfakit/locale') as string
    })
    const setLocale = async (locale: string) => {
      const token = await page.evaluate(() => {
        const cookie = document.cookie.split('; ').find((row) => row.startsWith('XSRF-TOKEN='))

        return cookie ? decodeURIComponent(cookie.split('=')[1] ?? '') : ''
      })

      await page.request.post(endpoint, {
        data: { locale },
        headers: {
          'X-XSRF-TOKEN': token,
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
    }

    try {
      for (const locale of LOCALES) {
        const errors = watchErrors(page)

        await setLocale(locale)

        for (const path of ['/admin', '/admin/posts', '/admin/posts/create']) {
          await page.goto(path)
          await expect(page.locator('[data-slot="content"]')).toBeVisible()
        }

        const lang = (await html.getAttribute('lang')) ?? ''
        const dir = await html.getAttribute('dir')

        if (!lang.toLowerCase().startsWith(locale.slice(0, 2))) errors.push(`lang is "${lang}"`)
        if (dir !== (RTL.includes(locale) ? 'rtl' : 'ltr')) errors.push(`dir is "${dir}"`)

        // No English left in the shell's own strings.
        if ((await page.getByRole('button', { name: 'Toggle sidebar', exact: true }).count()) > 0) {
          errors.push('"Toggle sidebar" is still in English')
        }

        // Right-to-left pages must not scroll sideways.
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )

        if (overflow > 2) errors.push(`the page is ${overflow}px wider than the window`)
        if (errors.length > 0) failures[locale] = errors

        page.removeAllListeners('pageerror')
        page.removeAllListeners('console')
        page.removeAllListeners('response')
      }

      // A language switch is not a new version of the app: the service worker is the same
      // file in every language, so none is left waiting behind a "Reload" notice.
      const waiting = await page.evaluate(async () =>
        'serviceWorker' in navigator
          ? (await navigator.serviceWorker.getRegistrations()).filter((entry) => entry.waiting)
              .length
          : 0,
      )

      if (waiting > 0) failures.worker = [`${waiting} service worker(s) waiting to take over`]
    } finally {
      await setLocale('en')
      await page.goto('/admin')
      await expect(html).toHaveAttribute('lang', /^en/)
    }

    expect(failures).toEqual({})
  })
})
