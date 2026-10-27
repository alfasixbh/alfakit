import { tick } from 'svelte'
import { inject } from 'vitest'

vi.unmock('@inertiajs/svelte')
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
  vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {})
})

// Rendered on the server by tests/ssr-global-setup.ts: once on a fresh server, once after
// panel pages loaded the split built-ins (Html, Tabs, Wizard, …) into the server's modules.
const { page, cold, warm } = inject('starterKitPage')

describe('a starter kit page on a long-lived SSR server (OM-B06)', () => {
  it('renders the same markup whatever the server rendered before', () => {
    expect(cold).toContain('data-server-rendered')
    expect(warm).toBe(cold)
  })

  it('hydrates in a fresh browser without a mismatch', { timeout: 30_000 }, async () => {
    window.history.replaceState(null, '', (page as { url: string }).url)
    document.body.innerHTML = warm

    // A fresh browser: none of the split built-ins loaded (the test setup preloads them all
    // for the other tests, in module instances this import no longer shares).
    vi.resetModules()
    const [{ createInertiaApp }, { AlfakitPage }, { createStarterKitLayout }] = await Promise.all([
      import('@inertiajs/svelte'),
      import('../src/pages'),
      import('../src/starter-kit'),
    ])
    const starterKitPage = {
      default: AlfakitPage,
      layout: createStarterKitLayout({ layout: null }),
    }
    const messages: string[] = []
    const record = (...args: unknown[]) => messages.push(args.map(String).join(' '))
    const spies = [
      vi.spyOn(console, 'error').mockImplementation(record),
      vi.spyOn(console, 'warn').mockImplementation(record),
    ]

    await createInertiaApp({ progress: false, resolve: () => starterKitPage as never })
    await tick()
    // The split built-ins load after hydration and then show.
    await vi.waitFor(
      () => {
        if (!document.getElementById('app')?.innerHTML.includes('<p>Some html</p>')) {
          throw new Error('Still loading')
        }
      },
      { timeout: 10_000, interval: 50 },
    )

    // Other split built-ins (the rich editor's parts…) keep loading after the Html block
    // shows: let them finish, so none is imported after the test environment is torn down.
    await vi.dynamicImportSettled()

    spies.forEach((spy) => spy.mockRestore())

    expect(messages.filter((message) => /hydrat|mismatch/i.test(message))).toEqual([])
    expect(warm.replace(/<script[^]*?<\/script>/g, '')).not.toContain('Some html')
  })
})
