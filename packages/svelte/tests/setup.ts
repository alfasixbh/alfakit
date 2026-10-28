import '@testing-library/jest-dom/vitest'
import { configure, getConfig } from '@testing-library/svelte'

declare global {
  var __alfakitPageProps: Record<string, unknown>
}

globalThis.__alfakitPageProps = {}

// jsdom lacks a few browser APIs bits-ui relies on.
if (typeof window !== 'undefined') {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
}

vi.mock('@inertiajs/svelte', async () => {
  const { default: Link } = await import('./MockLink.svelte')
  const page = {
    get props() {
      return globalThis.__alfakitPageProps
    },
    url: '/admin',
    component: 'Alfakit/Page',
    version: null,
  }

  return {
    page,
    usePage: () => page,
    Link,
    inertia: () => ({ destroy() {} }),
    router: { on: () => () => {}, visit: vi.fn(), post: vi.fn(), reload: vi.fn() },
  }
})

// Built-ins are split per type; jsdom tests render synchronously, so load them all first.
// (Node SSR tests preload through `resolve()`, so they import nothing here.) Preload in
// `beforeAll`, after the test file's hoisted `vi.mock`s are registered: importing the
// registry at setup top level would cache real modules before a test file mocks them.
if (typeof window !== 'undefined') {
  // This hook is where a test file that does not import the renderer itself loads all of
  // it (several hundred modules: about 9 s on an idle machine for the Svelte hydration
  // tests). Module loading has no timeout when it happens at a file's import time, so the
  // default 10 s hook timeout would only measure how busy the machine is.
  beforeAll(async () => {
    const { builtInComponents } = await import('../src/registry')

    await builtInComponents.preloadAll()
  }, 120_000)

  // Lazily loaded code (split built-ins, icons, editors, calendars) is fetched through
  // Vitest's module runner, which takes longer the busier the machine is. Let every pending
  // import finish before the file's environment is torn down (an import that resolves
  // afterwards fails with "Cannot load ... after the environment was torn down").
  afterAll(() => vi.dynamicImportSettled())

  // Rich editors scroll their selection into view after a toolbar button focuses them
  // (on the next animation frame, so possibly after the test's last assertion): ProseMirror
  // measures elements and ranges for that, and jsdom has no layout.
  const emptyRects = () => Object.assign([], { item: () => null }) as unknown as DOMRectList

  Element.prototype.getClientRects ??= emptyRects
  Range.prototype.getClientRects ??= emptyRects
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()

  // `waitFor()` / `findBy*()` time what the component does, not how long its lazily loaded
  // chunks take to import: pending imports settle before their timeout starts.
  const { asyncWrapper } = getConfig()
  configure({
    asyncWrapper: (callback) =>
      asyncWrapper(async () => {
        await vi.dynamicImportSettled()

        return callback()
      }),
  })
}
