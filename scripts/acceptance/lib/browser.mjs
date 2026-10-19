// A Playwright browser session that records every console error, page error, failed request
// and 5xx response, so each step can fail on the errors that happened while it ran.
import { createRequire } from 'node:module'
import { join } from 'node:path'

/** Playwright comes from the e2e workspace package (same version as the e2e suite). */
export function loadPlaywright(repo) {
  const require = createRequire(join(repo, 'e2e/package.json'))
  return require('@playwright/test')
}

export async function openSession(playwright, { baseURL, report }) {
  const headless = process.env.ACC_HEADED !== '1'
  const launch = (channel) => playwright.chromium.launch({ channel, headless })
  let browser
  if (process.env.ACC_BROWSER_CHANNEL) browser = await launch(process.env.ACC_BROWSER_CHANNEL)
  else {
    // Playwright's bundled Chromium; the installed Google Chrome (as e2e/ uses) when that
    // build was never downloaded (`playwright install chromium`).
    try {
      browser = await launch(undefined)
    } catch (error) {
      if (!/Executable doesn't exist/.test(error.message)) throw error
      browser = await launch('chrome')
    }
  }
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1366, height: 900 },
    locale: 'en-US',
    ignoreHTTPSErrors: true,
  })
  context.setDefaultTimeout(15_000)
  context.setDefaultNavigationTimeout(45_000)
  const page = await context.newPage()

  const errors = []
  const where = () => {
    try {
      return new URL(page.url()).pathname
    } catch {
      return page.url()
    }
  }
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const location = message.location()
      errors.push(`console.error on ${where()}: ${message.text()}${location?.url ? ` (${location.url}:${location.lineNumber})` : ''}`)
    }
  })
  page.on('pageerror', (error) => errors.push(`page error on ${where()}: ${error.message}`))
  page.on('response', (response) => {
    if (response.status() >= 500) {
      errors.push(`HTTP ${response.status()} ${response.request().method()} ${response.url()} (page ${where()})`)
    }
  })
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'failed'
    // A navigation that replaces the page aborts its pending requests: not an error.
    if (/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(failure)) return
    errors.push(`request failed: ${request.method()} ${request.url()} (${failure})`)
  })

  let shot = 0
  const session = {
    browser,
    context,
    page,
    errors,
    baseURL,
    async screenshot(step, label = '') {
      const file = `${String(++shot).padStart(2, '0')}-${step.id}${label ? `-${label}` : ''}.png`.replace(/[^\w.-]+/g, '-')
      try {
        await page.screenshot({ path: report.artifact(file), fullPage: true, timeout: 15_000 })
        step.screenshots.push(file)
      } catch (error) {
        step.detail += `\n(screenshot failed: ${error.message})`
      }
    },
    /** Hook for Report.step: fail on browser errors raised during the step, then screenshot. */
    stepHooks() {
      let mark = 0
      return {
        before: () => {
          mark = errors.length
        },
        after: async (step) => {
          const raised = errors.slice(mark)
          if (raised.length > 0 && step.status !== 'SKIP') {
            step.status = 'FAIL'
            step.detail = `${step.detail ? `${step.detail}\n` : ''}Browser errors during this step:\n- ${raised.join('\n- ')}`
          }
          if (step.status !== 'SKIP') await session.screenshot(step)
        },
      }
    },
    async close() {
      await context.close().catch(() => {})
      await browser.close().catch(() => {})
    },
  }
  return session
}
