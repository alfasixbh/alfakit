import { act, render, waitFor } from '@testing-library/react'
import dashboard from '../../core/tests/fixtures/ssr/dashboard.json'
import postsIndex from '../../core/tests/fixtures/ssr/posts-index.json'
import { Icon } from '../src/lib/icons'

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
  // Deferred props and prefetches never leave the test.
  vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {})
})

// Inertia updates <head> on a debounced timer; let it run before the environment goes away.
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
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
    const app = document.createElement('div')
    app.id = 'app'
    document.body.append(script, app)

    const { createAlfakit } = await import('../src/create-alfakit')
    const { router } = await import('@inertiajs/react')

    await act(async () => {
      await createAlfakit({ progress: false })
    })

    // Every named icon of the navigation (layout-dashboard, folder, file-text, tag) has loaded.
    await waitFor(() => expect(namedIcons()).toBe(4))

    const before = sidebar()
    const icons = sidebarIcons()
    const heading = document.querySelector('h1')

    await act(async () => {
      router.push({ component: postsIndex.component, url: postsIndex.url, props: postsIndex.props })
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    await waitFor(() => expect(document.querySelector('h1')).not.toBe(heading))

    // Same element: the layout was not remounted, and nothing in it had to load again.
    expect(sidebar()).toBe(before)
    expect(sidebarIcons()).toBe(icons)
    expect(namedIcons()).toBe(4)
    expect(document.querySelector('[data-slot="topbar"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="content"] [data-slot="page-header"]')).not.toBeNull()
    // The page's own layout only once: `PageShell` inside the page skips the hosted layout.
    expect(document.querySelectorAll('[data-sidebar="sidebar"]')).toHaveLength(1)
    expect(document.querySelectorAll('[data-slot="content"]')).toHaveLength(1)
  })
})

describe('named icons', () => {
  it('draw synchronously once loaded', async () => {
    const first = render(<Icon name="anchor" />)
    await waitFor(() => expect(first.container.querySelector('svg')).not.toBeNull())
    first.unmount()

    const second = render(<Icon name="anchor" />)
    // No waiting: the loaded icon renders in the first commit.
    expect(second.container.querySelector('svg.lucide-anchor')).not.toBeNull()
  })
})
