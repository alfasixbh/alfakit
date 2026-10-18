import { inject } from 'vitest'
import { nextTick, type App } from 'vue'

vi.unmock('@inertiajs/vue3')

beforeAll(() => {
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

describe.each(Object.keys(pages))('hydrating the %s page', (name) => {
  // The first hydration transforms every component for jsdom.
  it('matches the server markup', { timeout: 30_000 }, async () => {
    const { page, body } = pages[name]!
    expect(body).toContain('data-server-rendered')

    window.history.replaceState(null, '', (page as { url: string }).url)
    insertServerMarkup(body)
    const messages: string[] = []
    const record = (...args: unknown[]) => messages.push(args.map(String).join(' '))
    const spies = [
      vi.spyOn(console, 'error').mockImplementation(record),
      vi.spyOn(console, 'warn').mockImplementation(record),
    ]

    const { createAlfakit } = await import('../src/create-alfakit')
    await createAlfakit({ progress: false, withApp: (created) => void (app = created) })
    await nextTick()

    spies.forEach((spy) => spy.mockRestore())

    expect(messages.filter((message) => /hydrat|mismatch/i.test(message))).toEqual([])
    expect(document.getElementById('app')?.children.length).toBeGreaterThan(0)
  })
})
