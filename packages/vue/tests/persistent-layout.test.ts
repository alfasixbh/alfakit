import { mount } from '@vue/test-utils'
import { h, nextTick, ref, type App } from 'vue'
import dashboard from '../../core/tests/fixtures/ssr/dashboard.json'
import postsIndex from '../../core/tests/fixtures/ssr/posts-index.json'
import Icon from '../src/lib/Icon.vue'

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
  // Deferred props and prefetches never leave the test.
  vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {})
})

let app: App | null = null

afterEach(() => {
  app?.unmount()
  app = null
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
    const { router } = await import('@inertiajs/vue3')
    await createAlfakit({ progress: false, withApp: (created) => void (app = created) })

    // Every named icon of the navigation (layout-dashboard, folder, file-text, tag) has loaded.
    await vi.waitFor(() => expect(namedIcons()).toBe(4), { timeout: 10_000 })

    const before = sidebar()
    const icons = sidebarIcons()
    const heading = document.querySelector('h1')

    router.push({ component: postsIndex.component, url: postsIndex.url, props: postsIndex.props })
    await vi.waitFor(() => expect(document.querySelector('h1')).not.toBe(heading))
    await nextTick()

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
    const shown = ref(true)
    const wrapper = mount({
      render: () => (shown.value ? h(Icon, { name: 'anchor' }) : null),
    })
    await vi.waitFor(() => expect(wrapper.find('svg').exists()).toBe(true), { timeout: 10_000 })

    shown.value = false
    await nextTick()
    expect(wrapper.find('svg').exists()).toBe(false)

    shown.value = true
    await nextTick()
    // One render: the loaded icon is drawn by the mount itself, nothing loads again.
    expect(wrapper.find('svg.lucide-anchor').exists()).toBe(true)
    wrapper.unmount()
  })
})
