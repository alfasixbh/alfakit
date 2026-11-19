import { expect, test } from '../fixtures/test'

/**
 * Server-side rendering (docs: advanced/deployment, `alfakit:install --ssr`). Needs the SSR
 * bundles (`pnpm run build:ssr` in each playground) and `php artisan inertia:start-ssr`
 * running beside each site, so it only runs with `E2E_SSR=1`.
 */
const PAGES = [
  '/admin',
  '/admin/posts',
  '/admin/posts/create',
  '/admin/categories',
  '/admin/showcase/fields',
  '/admin/showcase/table',
  '/admin/showcase/gallery',
  '/admin/showcase/actions',
  '/admin/calendar',
  // Not `/contact`: that page belongs to the host application's own Inertia app, which the
  // playgrounds do not render on the server.
]

test.describe('server-side rendering', () => {
  test.skip(!process.env.E2E_SSR, 'set E2E_SSR=1 (with the SSR servers running) to run')

  test('pages arrive rendered and hydrate without a mismatch', async ({ page, browser }, info) => {
    test.setTimeout(240_000)

    const failures: Record<string, string[]> = {}
    const noScript = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: info.project.use.baseURL,
      storageState: `.auth/${info.project.name}.json`,
    })
    const server = await noScript.newPage()

    for (const path of PAGES) {
      const problems: string[] = []

      // Without JavaScript the page is what the server rendered.
      await server.goto(path)

      const rendered = (await server.locator('body').innerText()).trim()

      if (rendered.length < 40) problems.push('the server sent no rendered content')

      const messages: string[] = []
      const listener = (message: { type(): string; text(): string }) => {
        if (/hydrat|mismatch|did not match/i.test(message.text()))
          messages.push(message.text().slice(0, 300))
      }

      page.on('console', listener)
      page.on('pageerror', (error) => messages.push(`page error: ${error.message}`))
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      page.off('console', listener)
      page.removeAllListeners('pageerror')

      problems.push(...messages)

      if (problems.length > 0) failures[path] = problems
    }

    await noScript.close()
    expect(failures).toEqual({})
  })
})
