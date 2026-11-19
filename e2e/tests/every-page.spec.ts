import { type Page } from '@playwright/test'
import { expect, test } from '../fixtures/test'

/**
 * Docs-driven smoke test: every page the sidebar links to, and the create, edit and view page
 * of every resource, opens without a browser error, a failed request or an empty content area.
 */

interface Problems {
  errors: string[]
}

function watch(page: Page): Problems {
  const problems: Problems = { errors: [] }

  page.on('pageerror', (error) => problems.errors.push(`page error: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() !== 'error') return

    const text = message.text()

    // A missing image or favicon of seeded demo content is not a defect of the page.
    if (/Failed to load resource/.test(text)) return

    problems.errors.push(`console: ${text.slice(0, 300)}`)
  })
  page.on('response', (response) => {
    const url = response.url()
    const status = response.status()

    if (status >= 500 || (status >= 400 && url.includes('/_alfakit/'))) {
      problems.errors.push(`http ${status}: ${url}`)
    }
  })

  return problems
}

/** Opens `path`; answers what is wrong with it (nothing, when it shows its content). */
async function open(page: Page, path: string): Promise<string[]> {
  const response = await page.goto(path)
  const problems: string[] = []

  if (response && response.status() >= 400) problems.push(`the page answered ${response.status()}`)

  // Deferred props, lazy widgets and lazily loaded editors.
  await page.waitForLoadState('networkidle')

  const content = page.locator('[data-slot="content"]')

  // A heavy page may still be painting when the network goes quiet.
  await content
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => undefined)

  if ((await content.count()) === 0) {
    problems.push(`no content area (ended on ${new URL(page.url()).pathname})`)
  } else if ((await content.first().innerText()).trim().length < 15) {
    problems.push('the content area is empty')
  }

  return problems
}

async function sidebarPaths(page: Page): Promise<string[]> {
  await open(page, '/admin')

  const hrefs = await page
    .locator('a[href]')
    .evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href))
  const origin = new URL(page.url()).origin

  return (
    [...new Set(hrefs)]
      .filter((href) => href.startsWith(`${origin}/admin`))
      .map((href) => new URL(href).pathname)
      // Scalar's API reference is a page of its own, outside the panel shell.
      .filter((path) => path !== '/admin/api-docs')
  )
}

test.describe('every page', () => {
  test.setTimeout(600_000)

  test('every sidebar page opens clean', async ({ page }) => {
    const paths = await sidebarPaths(page)
    const failures: Record<string, string[]> = {}

    expect(paths.length).toBeGreaterThan(30)

    for (const path of paths) {
      const problems = watch(page)

      let found = await open(page, path)

      // The local test server drops a request now and then: a page gets a second chance.
      if (found.length > 0) found = await open(page, path)

      problems.errors.push(...found)

      if (problems.errors.length > 0) failures[path] = problems.errors

      page.removeAllListeners('pageerror')
      page.removeAllListeners('console')
      page.removeAllListeners('response')
    }

    expect(failures).toEqual({})
  })

  test('the create, edit and view pages of every resource open clean', async ({ page }) => {
    const paths = await sidebarPaths(page)
    const failures: Record<string, string[]> = {}
    const visited: string[] = []

    for (const list of paths) {
      await open(page, list)

      const hrefs = await page
        .locator('[data-slot="content"] a[href]')
        .evaluateAll((links) =>
          links.map((link) => new URL((link as HTMLAnchorElement).href).pathname),
        )
      const own = [...new Set(hrefs)].filter((href) => href.startsWith(`${list}/`))
      const targets = [
        own.find((href) => href.endsWith('/create')),
        own.find((href) => /\/[^/]+\/edit$/.test(href)),
        own.find(
          (href) =>
            href.split('/').length === list.split('/').length + 1 &&
            !href.endsWith('/create') &&
            // A signed file download (`backups/download?signature=…`) is no page.
            !href.endsWith('/download'),
        ),
      ].filter((href): href is string => href !== undefined)

      for (const target of targets) {
        const problems = watch(page)

        let found = await open(page, target)

        if (found.length > 0) found = await open(page, target)

        problems.errors.push(...found)

        if (problems.errors.length > 0) failures[target] = problems.errors

        visited.push(target)
        page.removeAllListeners('pageerror')
        page.removeAllListeners('console')
        page.removeAllListeners('response')
      }
    }

    expect(visited.length).toBeGreaterThan(20)
    expect(failures).toEqual({})
  })
})
