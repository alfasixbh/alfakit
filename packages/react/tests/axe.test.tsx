import type { StandaloneComponentSchema } from '@alfakit/core'
import { act, render } from '@testing-library/react'
import { inject } from 'vitest'
import contactForm from '../../core/tests/fixtures/standalone/contact-form.json'
import {
  describeViolations,
  formatViolations,
  prepareAxeEnvironment,
  runAxe,
} from '../../core/tests/support/axe'

vi.unmock('@inertiajs/react')

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

afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
})

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
    await act(async () => {
      await createAlfakit({ progress: false })
    })

    const results = await runAxe(document.getElementById('app')!)
    const violations = formatViolations(results)

    expect(violations, describeViolations(violations)).toEqual([])
  })
})

describe('WCAG 2.1 AA (axe) on a standalone form', () => {
  it('reports no violations', { timeout: 60_000 }, async () => {
    const form = contactForm as unknown as StandaloneComponentSchema
    globalThis.__alfakitPageProps = { form, errors: {} }
    const { AlfakitComponent } = await import('../src/standalone')

    const { container } = render(
      <main>
        <AlfakitComponent component={form} />
      </main>,
    )

    const results = await runAxe(container)
    const violations = formatViolations(results)

    expect(violations, describeViolations(violations)).toEqual([])
  })
})
