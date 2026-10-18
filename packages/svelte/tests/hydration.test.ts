import { tick } from 'svelte'
import { inject } from 'vitest'

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

describe.each(Object.keys(pages))('hydrating the %s page', (name) => {
  // The first hydration compiles every component for jsdom.
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
    await createAlfakit({ progress: false })
    await tick()

    spies.forEach((spy) => spy.mockRestore())

    expect(messages.filter((message) => /hydrat|mismatch/i.test(message))).toEqual([])
    expect(document.getElementById('app')?.children.length).toBeGreaterThan(0)
  })
})
