import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import dashboard from '../../core/tests/fixtures/ssr/dashboard.json'
import postsIndex from '../../core/tests/fixtures/ssr/posts-index.json'
import IconToggleHarness from './IconToggleHarness.svelte'

vi.unmock('@inertiajs/svelte')

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
  // Deferred props and prefetches never leave the test.
  vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {})
})

const sidebar = () => document.querySelector('[data-sidebar="sidebar"]')
const sidebarIcons = () => sidebar()?.querySelectorAll('svg').length ?? 0
const namedIcons = () =>
  sidebar()?.querySelectorAll(
    'svg.lucide-layout-dashboard, svg.lucide-folder, svg.lucide-file-text, svg.lucide-tag',
  ).length ?? 0

describe('panel layout across visits', () => {
  it('keeps the sidebar mounted and its icons drawn when visiting another page', async () => {
    window.history.replaceState(null, '', dashboard.url)
    document.body.innerHTML = ''
    const script = document.createElement('script')
    script.type = 'application/json'
    script.dataset.page = 'app'
    script.textContent = JSON.stringify(dashboard)
    const root = document.createElement('div')
    root.id = 'app'
    document.body.append(script, root)

    const { createAlfakit } = await import('../src/create-alfakit')
    const { router } = await import('@inertiajs/svelte')
    await createAlfakit({ progress: false })

    // Every named icon of the navigation (layout-dashboard, folder, file-text, tag) has loaded.
    await vi.waitFor(() => expect(namedIcons()).toBe(4), { timeout: 10_000 })

    const before = sidebar()
    const icons = sidebarIcons()
    const heading = document.querySelector('h1')

    router.push({ component: postsIndex.component, url: postsIndex.url, props: postsIndex.props })
    await vi.waitFor(() => expect(document.querySelector('h1')).not.toBe(heading))
    await tick()

    // Same element: the layout was not remounted, and nothing in it had to load again.
    expect(sidebar()).toBe(before)
    expect(sidebarIcons()).toBe(icons)
    expect(namedIcons()).toBe(4)
    expect(document.querySelector('[data-slot="content"] [data-slot="page-header"]')).not.toBeNull()
    // The layout only once: `PageShell` inside the page skips the hosted layout.
    expect(document.querySelectorAll('[data-sidebar="sidebar"]')).toHaveLength(1)
    expect(document.querySelectorAll('[data-slot="content"]')).toHaveLength(1)
  })
})

describe('named icons', () => {
  it('draw synchronously once loaded', async () => {
    const { container, rerender } = render(IconToggleHarness, { shown: true, name: 'anchor' })
    await vi.waitFor(() => expect(container.querySelector('svg')).not.toBeNull(), {
      timeout: 10_000,
    })

    await rerender({ shown: false, name: 'anchor' })
    expect(container.querySelector('svg')).toBeNull()

    await rerender({ shown: true, name: 'anchor' })
    // One render: the loaded icon is drawn by the mount itself, nothing loads again.
    expect(container.querySelector('svg.lucide-anchor')).not.toBeNull()
  })
})
