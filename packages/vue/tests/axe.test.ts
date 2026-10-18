import type { StandaloneComponentSchema } from '@alfakit/core'
import { mount } from '@vue/test-utils'
import { inject } from 'vitest'
import { defineComponent, h, nextTick, type App } from 'vue'
import contactForm from '../../core/tests/fixtures/standalone/contact-form.json'
import {
  describeViolations,
  formatViolations,
  prepareAxeEnvironment,
  runAxe,
} from '../../core/tests/support/axe'

vi.unmock('@inertiajs/vue3')

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

// Rendered on the server by tests/ssr-global-setup.ts.
const pages = inject('ssrPages')
let app: App | null = null

afterEach(() => {
  app?.unmount()
  app = null
})

describe.each(Object.keys(pages))('WCAG 2.1 AA (axe) on the hydrated %s page', (name) => {
  it('reports no violations', { timeout: 60_000 }, async () => {
    const { page, body } = pages[name]!

    window.history.replaceState(null, '', (page as { url: string }).url)
    insertServerMarkup(body)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { createAlfakit } = await import('../src/create-alfakit')
    await createAlfakit({ progress: false, withApp: (created) => void (app = created) })
    await nextTick()

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

    const Host = defineComponent({
      setup: () => () => h('main', [h(AlfakitComponent, { component: form })]),
    })
    const wrapper = mount(Host, { attachTo: document.body })
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 20))

    const results = await runAxe(wrapper.element as Element)
    const violations = formatViolations(results)

    expect(violations, describeViolations(violations)).toEqual([])
    wrapper.unmount()
  })
})
