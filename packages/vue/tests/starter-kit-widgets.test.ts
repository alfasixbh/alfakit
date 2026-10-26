import {
  resetStarterKitPanels,
  shortcuts,
  type PanelSchema,
  type StarterKitNavigationSchema,
} from '@alfakit/core'
import { router as inertiaCore } from '@inertiajs/core'
import { router } from '@inertiajs/vue3'
import { mount } from '@vue/test-utils'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { toast } from 'vue-sonner'
import AlfakitRoot from '../src/AlfakitRoot.vue'
import { toastOptions } from '../src/components/notifications/flash-toasts'
import AlfakitToaster from '../src/standalone/AlfakitToaster.vue'
import {
  AlfakitCopilot,
  AlfakitLanguageSwitcher,
  AlfakitNotifications,
  AlfakitSearch,
  AlfakitTenantSwitcher,
} from '../src/starter-kit'
import { flush, mountWithAlfakit, panel, setPageProps } from './mocks'

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
  // vue-sonner's toaster reads the colour scheme.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  })) as unknown as typeof window.matchMedia
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

// vue-sonner renders its toaster as a `<section aria-label="Notifications alt+T">`.
const toasters = () => document.querySelectorAll('section[aria-label^="Notifications"]')

const bellLoaded = () =>
  until(
    () =>
      document
        .querySelector('button[aria-label="Notifications"]')
        ?.getAttribute('aria-haspopup') === 'dialog',
  )

const settle = async () => {
  await flush()
  await nextTick()
  await flush()
}

describe('starter kit header components', () => {
  describe('toasts on host pages (W-S1-03)', () => {
    it('mount one toaster for the push toggle and PWA messages', async () => {
      const wrapper = mount(() => [h(AlfakitSearch), h(AlfakitNotifications)], {
        attachTo: document.body,
      })

      await bellLoaded()
      await settle()
      expect(toasters()).toHaveLength(1)

      toast.success('Notifications are on for this device', toastOptions())
      await until(
        () => document.body.textContent?.includes('Notifications are on for this device') ?? false,
      )

      expect(document.body.textContent?.split('Notifications are on for this device').length).toBe(
        2,
      )

      toast.dismiss()
      wrapper.unmount()
    })

    it('use the toaster the page already has', async () => {
      const wrapper = mount(() => [h(AlfakitNotifications), h(AlfakitToaster)], {
        attachTo: document.body,
      })

      await bellLoaded()
      await settle()

      expect(toasters()).toHaveLength(1)
      wrapper.unmount()
    })

    it("use AlfakitRoot's toaster when one is mounted", async () => {
      const wrapper = mountWithAlfakit(() => [
        h(AlfakitNotifications),
        h(AlfakitRoot, null, () => h('div')),
      ])

      await bellLoaded()
      await settle()

      expect(toasters()).toHaveLength(1)
      wrapper.unmount()
    })

    it('mount none on AlfaKit pages, which have their own', async () => {
      setPageProps({ alfakit: panel, page: undefined, alfakitNavigation: [navigation] })

      const wrapper = mount(AlfakitNotifications, { attachTo: document.body })

      await bellLoaded()
      await settle()

      expect(toasters()).toHaveLength(0)
      wrapper.unmount()
    })
  })

  it('shows the impersonation banner once on host pages, with Leave', async () => {
    const post = vi.spyOn(router, 'post').mockImplementation(() => {})
    const impersonation = {
      label: 'Signed in as Dana',
      leaveLabel: 'Leave',
      leaveUrl: '/admin/impersonation/leave',
    }
    setPageProps({
      alfakit: undefined,
      page: undefined,
      alfakitNavigation: [{ ...navigation, widgets: { ...navigation.widgets!, impersonation } }],
    })

    const wrapper = mount(() => [h(AlfakitSearch), h(AlfakitNotifications)], {
      attachTo: document.body,
    })
    // The banner's code loads lazily (only while impersonating).
    await vi.waitFor(async () => {
      await flush()
      expect(wrapper.findAll('[data-slot="impersonation-banner"]')).toHaveLength(1)
    })

    const banners = wrapper.findAll('[data-slot="impersonation-banner"]')
    expect(banners).toHaveLength(1)
    expect(banners[0]!.text()).toContain('Signed in as Dana')
    await banners[0]!.find('button').trigger('click')
    expect(post).toHaveBeenCalledWith('/admin/impersonation/leave', {}, expect.anything())

    wrapper.unmount()
  })

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

  it('shows the team menu of a second starterKit() panel without a panel prop', async () => {
    setPageProps({
      alfakitNavigation: [
        navigation,
        {
          ...navigation,
          id: 'app',
          url: '/app',
          widgets: {
            endpoint: '/app/_alfakit/starter-kit',
            tenancy: { current: null, tenants: [{ id: 1, name: 'Acme', url: '/app/1' }] },
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

  it('opens the AI copilot with mod+j pressed before its code loaded', async () => {
    const copilot = {
      type: 'ai:copilot',
      key: 'ai-copilot',
      endpoints: {
        conversations: '/admin/_ai/copilot/conversations',
        conversation: '/admin/_ai/copilot/conversations/__ID__',
        send: '/admin/_ai/copilot/messages',
        confirm: '/admin/_ai/copilot/actions/__ID__/confirm',
        reject: '/admin/_ai/copilot/actions/__ID__/reject',
        delete: '/admin/_ai/copilot/conversations/__ID__',
      },
      placeholder: '__ID__',
      keyBindings: ['mod+j'],
      canUse: true,
      notice: { status: 'warning', heading: "AI isn't set up yet" },
    }
    setPageProps({
      alfakitNavigation: [
        {
          ...navigation,
          widgets: {
            ...navigation.widgets!,
            copilot: { label: 'Open AI copilot', keyBindings: ['mod+j'] },
          },
        },
      ],
    })
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith('/admin/_alfakit/starter-kit')
        ? respond({
            ...loaded,
            slots: { 'topbar.end': [{ type: 'component', component: copilot }] },
          })
        : respond({ conversations: [] }),
    )

    const wrapper = mount(AlfakitCopilot, { attachTo: document.body })

    expect(document.querySelector('[data-slot="starter-kit-copilot"]')).not.toBeNull()
    expect(wrapper.find('button[aria-label="Open AI copilot"]').exists()).toBe(true)
    expect(shortcuts.has('ai.copilot')).toBe(true)

    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'j', code: 'KeyJ', ctrlKey: true, bubbles: true }),
    )

    await until(
      () => document.querySelector('[role="dialog"]')?.textContent?.includes('set up') ?? false,
    )

    expect(fetchMock).toHaveBeenCalledWith('/admin/_alfakit/starter-kit', expect.anything())
    expect(document.querySelector('[role="dialog"]')!.textContent).toContain("AI isn't set up yet")
    wrapper.unmount()
  })

  it('renders no copilot without the AI plugin', () => {
    const wrapper = mount(AlfakitCopilot)

    expect(wrapper.html()).toBe('')
    wrapper.unmount()
  })

  describe('language switcher', () => {
    const locales = [
      { code: 'en', tag: 'en', label: 'English', direction: 'ltr' as const },
      { code: 'fr', tag: 'fr', label: 'Français', direction: 'ltr' as const },
    ]
    const localized = (code: 'en' | 'fr'): PanelSchema => ({
      ...loaded,
      endpoints: { ...loaded.endpoints, locale: '/admin/_alfakit/locale' },
      localization: {
        ...locales.find((locale) => locale.code === code)!,
        switcher: true,
        switcherPosition: 'user-menu',
        locales,
      } as PanelSchema['localization'],
      translations: { change_language: code === 'fr' ? 'Changer de langue' : 'Change language' },
    })
    const withLanguage = (code: 'en' | 'fr'): StarterKitNavigationSchema => ({
      ...navigation,
      widgets: {
        ...navigation.widgets!,
        language: {
          label: code === 'fr' ? 'Changer de langue' : 'Change language',
          current: locales.find((locale) => locale.code === code)!,
        },
      },
    })

    it('renders nothing with one language', () => {
      const wrapper = mount(AlfakitLanguageSwitcher)

      expect(wrapper.html()).toBe('')
      wrapper.unmount()
    })

    it('shows the current language, posts the new one and follows the refreshed page', async () => {
      // `switchLocale()` posts through Inertia's core router.
      const post = vi.spyOn(inertiaCore, 'post').mockImplementation(() => {})
      let language: 'en' | 'fr' = 'en'
      setPageProps({ alfakitNavigation: [withLanguage('en')] })
      fetchMock.mockImplementation(async (url: string) =>
        respond(url.startsWith('/admin/_alfakit/starter-kit') ? localized(language) : {}),
      )

      const wrapper = mount(AlfakitLanguageSwitcher, { attachTo: document.body })

      // Straight away, from the shared prop.
      expect(document.querySelector('[data-slot="starter-kit-language-switcher"]')).not.toBeNull()
      const trigger = wrapper.find('button[aria-label="Change language"]')
      expect(trigger.text()).toBe('English')

      // A click before the menu loaded opens it once loaded.
      await trigger.trigger('click')

      const option = () =>
        [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')].find((item) =>
          item.textContent?.includes('Français'),
        )
      await until(() => option() !== undefined)
      option()!.click()
      await flush()

      expect(post).toHaveBeenCalledWith(
        '/admin/_alfakit/locale',
        { locale: 'fr' },
        expect.objectContaining({ preserveState: false }),
      )
      wrapper.unmount()

      // The page reloads in French: the shared prop names it, and the panel data loads again.
      language = 'fr'
      setPageProps({ alfakitNavigation: [withLanguage('fr')] })
      const reloaded = mount(AlfakitLanguageSwitcher, { attachTo: document.body })

      await until(() => document.querySelector('button[aria-label="Changer de langue"]') !== null)
      await until(
        () =>
          fetchMock.mock.calls.filter(([url]) =>
            String(url).startsWith('/admin/_alfakit/starter-kit'),
          ).length === 2,
      )
      await flush()

      const french = document.querySelector('[data-slot="starter-kit-language-switcher"] button')!
      expect(french.getAttribute('aria-label')).toBe('Changer de langue')
      expect(french.textContent).toContain('Français')
      expect(
        fetchMock.mock.calls.filter(([url]) =>
          String(url).startsWith('/admin/_alfakit/starter-kit'),
        ),
      ).toHaveLength(2)
      reloaded.unmount()
    })
  })
})
