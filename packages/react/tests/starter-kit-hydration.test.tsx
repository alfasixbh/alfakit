import { act } from '@testing-library/react'
import { inject } from 'vitest'

vi.unmock('@inertiajs/react')

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

afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
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
    const [{ createInertiaApp }, { hydrateRoot }, { createStarterKitPage }] = await Promise.all([
      import('@inertiajs/react'),
      import('react-dom/client'),
      import('../src/starter-kit'),
    ])
    const StarterKitPage = createStarterKitPage({ layout: null })
    const messages: string[] = []
    const record = (...args: unknown[]) => messages.push(args.map(String).join(' '))
    const spies = [
      vi.spyOn(console, 'error').mockImplementation(record),
      vi.spyOn(console, 'warn').mockImplementation(record),
    ]

    await act(async () => {
      await createInertiaApp({
        progress: false,
        resolve: () => StarterKitPage,
        setup: ({ el, App, props }) => {
          hydrateRoot(el!, <App {...props} />, { onRecoverableError: (error) => record(error) })
        },
      })
    })
    // The split built-ins load after hydration and then show.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200))
    })

    spies.forEach((spy) => spy.mockRestore())

    expect(messages.filter((message) => /hydrat|mismatch|#418/i.test(message))).toEqual([])
    expect(warm.replace(/<script[^]*?<\/script>/g, '')).not.toContain('Some html')
    expect(document.getElementById('app')?.innerHTML).toContain('<p>Some html</p>')
  })
})
