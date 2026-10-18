import type { StandaloneComponentSchema } from '@alfakit/core'
import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { inject } from 'vitest'
import contactForm from '../../core/tests/fixtures/standalone/contact-form.json'
import {
  describeViolations,
  formatViolations,
  prepareAxeEnvironment,
  runAxe,
} from '../../core/tests/support/axe'
import StandaloneHarness from './StandaloneHarness.svelte'

vi.unmock('@inertiajs/svelte')
// jsdom has no canvas; the chart itself is not part of the server markup.
vi.mock('chart.js', () => ({
  Chart: class {
    static register() {}
    update() {}
    destroy() {}
  },
  registerables: [],
}))

beforeAll(() => {
  prepareAxeEnvironment()
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  // Lazy widgets reload their data after mounting; no request leaves the test.
  vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {})
})

/** Earlier apps keep their (now hidden) markup, so they never act on detached nodes. */
function insertServerMarkup(body: string): void {
  for (const element of document.querySelectorAll('#app')) {
    element.removeAttribute('id')
    element.setAttribute('hidden', '')
  }

  document.querySelectorAll('script[data-page="app"]').forEach((script) => script.remove())
  document.body.insertAdjacentHTML('beforeend', body)
}

// Let lazily loaded editors and charts finish importing before the environment closes.
afterAll(async () => {
  await vi.waitFor(
    () => {
      if (document.querySelector('[data-slot="field"] [data-slot="skeleton"]')) {
        throw new Error('Still loading')
      }
    },
    { timeout: 20_000, interval: 100 },
  )
}, 30_000)

// Rendered on the server by tests/ssr-global-setup.ts.
const pages = inject('ssrPages')

describe.each(Object.keys(pages))('WCAG 2.1 AA (axe) on the hydrated %s page', (name) => {
  it('reports no violations', { timeout: 60_000 }, async () => {
    const { page, body } = pages[name]!

    window.history.replaceState(null, '', (page as { url: string }).url)
    insertServerMarkup(body)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { createAlfakit } = await import('../src/create-alfakit')
    await createAlfakit({ progress: false })
    await tick()

    const results = await runAxe(document.getElementById('app')!)
    const violations = formatViolations(results)

    expect(violations, describeViolations(violations)).toEqual([])
  })
})

describe('WCAG 2.1 AA (axe) on a standalone form', () => {
  it('reports no violations', { timeout: 60_000 }, async () => {
    const form = contactForm as unknown as StandaloneComponentSchema
    globalThis.__alfakitPageProps = { form, errors: {} }

    const main = document.createElement('main')
    document.body.appendChild(main)
    render(StandaloneHarness, { props: { component: form }, target: main })
    await tick()
    await new Promise((resolve) => setTimeout(resolve, 20))

    const results = await runAxe(main)
    const violations = formatViolations(results)

    expect(violations, describeViolations(violations)).toEqual([])
  })
})
