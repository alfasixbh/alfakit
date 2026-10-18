import {
  resetStarterKitPanels,
  shortcuts,
  type PanelSchema,
  type StarterKitNavigationSchema,
} from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { mount } from '@vue/test-utils'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { AlfakitNotifications, AlfakitSearch, AlfakitTenantSwitcher } from '../src/starter-kit'
import { flush, panel, setPageProps } from './mocks'

const navigation: StarterKitNavigationSchema = {
  id: 'admin',
  url: '/admin',
  brandName: 'Admin',
  groups: [{ label: 'Blog', collapsible: true, items: [{ label: 'Posts', url: '/admin/posts' }] }],
  widgets: {
    endpoint: '/admin/_alfakit/starter-kit',
    search: { keyBindings: ['mod+k'], placeholder: 'Search' },
    notifications: { label: 'Notifications', unreadCount: 2 },
  },
}

// What `widgets.endpoint` answers: the `alfakit` prop of the panel's pages.
const loaded: PanelSchema = {
  ...panel,
  starterKit: true,
  globalSearch: { keyBindings: ['mod+k'], placeholder: 'Search' },
  commandPalette: { commands: [{ type: 'Action', name: 'clear', label: 'Clear cache' }] },
  databaseNotifications: { unreadCount: 0 },
  localization: { tag: 'en', direction: 'ltr' } as PanelSchema['localization'],
  translations: { notifications: 'Notifications' },
}

const respond = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

const until = async (check: () => boolean) => {
  for (let attempt = 0; attempt < 100 && !check(); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 10))
    await flush()
  }
}

let fetchMock: ReturnType<typeof vi.fn>

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView ??= () => {}
})

beforeEach(() => {
  resetStarterKitPanels()
  // A page of the host application: no `alfakit` prop, only the shared navigation.
  setPageProps({ alfakit: undefined, page: undefined, alfakitNavigation: [navigation] })
  fetchMock = vi.fn().mockImplementation(async (url: string) => {
    if (url.startsWith('/admin/_alfakit/starter-kit')) return respond(loaded)
    if (url.startsWith('/g')) {
      return respond({
        groups: [{ label: 'Posts', results: [{ title: 'Hello world', url: '/admin/posts/1' }] }],
      })
    }
    if (url.startsWith('/n')) {
      return respond({
        notifications: [{ id: 'n1', title: 'Order shipped', readAt: null }],
        unreadCount: 2,
        hasMore: false,
        page: 1,
      })
    }

    return respond({})
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  setPageProps({ alfakit: panel, page: undefined, alfakitNavigation: undefined })
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('starter kit header components', () => {
  it('render nothing for guests', () => {
    setPageProps({ alfakitNavigation: undefined })

    const wrapper = mount(() => [
      h(AlfakitSearch),
      h(AlfakitNotifications),
      h(AlfakitTenantSwitcher),
    ])

    expect(wrapper.html()).toBe('')
    wrapper.unmount()
  })

  it('opens the palette with the key bindings pressed before it loaded and visits a result', async () => {
    const wrapper = mount(AlfakitSearch, { attachTo: document.body })

    expect(document.querySelector('[data-slot="starter-kit-search"]')).not.toBeNull()
    expect(shortcuts.has('palette.open')).toBe(true)

    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: true, bubbles: true }),
    )

    await until(() => document.querySelector('[role="dialog"]') !== null)

    const dialog = () => document.querySelector('[role="dialog"]')!
    expect(fetchMock).toHaveBeenCalledWith('/admin/_alfakit/starter-kit', expect.anything())
    // The shared navigation is listed; panel commands need an Alfakit page, theme items the panel's chrome.
    expect(dialog().textContent).toContain('Posts')
    expect(dialog().textContent).not.toContain('Clear cache')
    expect(dialog().textContent).not.toContain('Dark theme')

    const input = dialog().querySelector<HTMLInputElement>('input')!
    input.value = 'hello'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await until(() => dialog().textContent?.includes('Hello world') ?? false)

    const item = [...document.querySelectorAll<HTMLElement>('[data-slot="command-item"]')].find(
      (element) => element.textContent?.includes('Hello world'),
    )!
    item.click()
    await flush()

    expect(router.visit).toHaveBeenCalledWith('/admin/posts/1')
    wrapper.unmount()
  })

  it('shows the unread count straight away and the notifications once loaded', async () => {
    const wrapper = mount(AlfakitNotifications, { attachTo: document.body })
    const bell = () => wrapper.find('button[aria-label="Notifications"]')

    expect(bell().text()).toBe('2')

    await until(() => bell().attributes('aria-haspopup') === 'dialog')
    expect(bell().text()).toContain('2')

    await bell().trigger('click')
    await until(() => document.body.textContent?.includes('Order shipped') ?? false)

    expect(document.body.textContent).toContain('Order shipped')
    wrapper.unmount()
  })

  it('lists the tenants to choose from on host pages', async () => {
    setPageProps({
      alfakitNavigation: [
        {
          ...navigation,
          widgets: {
            endpoint: '/admin/_alfakit/starter-kit',
            tenancy: {
              current: null,
              tenants: [
                { id: 1, name: 'Acme', url: '/admin/1' },
                { id: 2, name: 'Globex', url: '/admin/2' },
              ],
            },
          },
        },
      ],
    })
    fetchMock.mockImplementation(async () =>
      respond({ ...loaded, tenancy: { current: null, tenants: [] } }),
    )

    const wrapper = mount(AlfakitTenantSwitcher, { attachTo: document.body })

    await until(() => wrapper.text().includes('Choose a tenant'))
    expect(wrapper.text()).toContain('Choose a tenant')
    wrapper.unmount()
  })
})
