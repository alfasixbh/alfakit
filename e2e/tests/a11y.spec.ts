import { expect, test, type Page } from '@playwright/test'
import type axeCore from 'axe-core'
import { fileURLToPath } from 'node:url'
import { credentials } from '../fixtures/credentials'

/**
 * axe-core in a real browser: the WCAG 2.1 A/AA rule set including `color-contrast`, which
 * the jsdom suites in packages/<renderer>/tests/axe.test.* cannot evaluate.
 */
const axeScript = fileURLToPath(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url))

interface AxeNode {
  target: string[]
  html: string
  failureSummary?: string
}
interface AxeViolation {
  id: string
  impact?: string
  help: string
  nodes: AxeNode[]
}

async function runAxe(page: Page, selector?: string): Promise<AxeViolation[]> {
  await page.addScriptTag({ path: axeScript })

  return page.evaluate(async (scope) => {
    const axe = (window as unknown as { axe: typeof axeCore }).axe
    const results = await axe.run(scope ?? document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      resultTypes: ['violations'],
    })

    return results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? undefined,
      help: violation.help,
      nodes: violation.nodes.map((node) => ({
        target: node.target.map(String),
        html: node.html.slice(0, 200),
        failureSummary: node.failureSummary,
      })),
    }))
  }, selector)
}

const describe = (violations: AxeViolation[]) =>
  violations
    .map(
      (violation) =>
        `[${violation.impact}] ${violation.id}: ${violation.help}\n` +
        violation.nodes
          .map((node) => `    - ${node.target.join(' ')}\n      ${node.html}`)
          .join('\n'),
    )
    .join('\n')

// `/contact` renders inside the playground's own starter-kit layout, so only the Alfakit
// component (`data-slot="standalone"`) is audited there.
const pages: Array<[string, string?]> = [
  ['/admin'],
  ['/admin/posts'],
  ['/admin/posts/create'],
  ['/admin/posts/1/edit'],
  ['/contact', '[data-slot="standalone"]'],
]

for (const [path, selector] of pages) {
  test(`axe WCAG 2.1 AA: ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')

    const violations = await runAxe(page, selector)
    expect(violations, describe(violations)).toEqual([])
  })
}

test.describe('without a session', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('axe WCAG 2.1 AA: /admin/login (idle and with an error)', async ({ page }) => {
    await page.goto('/admin/login')
    let violations = await runAxe(page)
    expect(violations, describe(violations)).toEqual([])

    await page.getByLabel(/email/i).fill(credentials.email)
    await page.getByLabel(/^password/i).fill('wrong')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByRole('alert').first()).toBeVisible()

    violations = await runAxe(page)
    expect(violations, describe(violations)).toEqual([])
  })
})
