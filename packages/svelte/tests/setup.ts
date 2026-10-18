import '@testing-library/jest-dom/vitest'

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
  beforeAll(async () => {
    const { builtInComponents } = await import('../src/registry')

    await builtInComponents.preloadAll()
  })
}
