import type { AlfakitPageProps, PageSchema } from '@alfakit/core'
import { mount } from '@vue/test-utils'
import { ConfigProvider } from 'reka-ui'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { defineComponent, h, type PropType } from 'vue'
import { showToast } from '../src/components/notifications/flash-toasts'
import { Dialog, DialogContent, DialogTitle } from '../src/components/ui'
import {
  AlfakitStarterKitRoot,
  createStarterKitPage,
  useAlfakitNavigation,
} from '../src/starter-kit'
import { flush, panel, setPageProps } from './mocks'

const HostLayout = defineComponent({
  name: 'HostLayout',
  props: {
    breadcrumbs: { type: Array as PropType<{ title: string; href: string }[]>, default: () => [] },
  },
  setup(props, { slots }) {
    return () =>
      h('div', { 'data-testid': 'host-layout' }, [
        h(
          'nav',
          { 'aria-label': 'breadcrumb' },
          props.breadcrumbs.map((crumb) => crumb.title).join(' / '),
        ),
        slots.default?.(),
      ])
  },
})

const page = {
  title: 'Posts',
  token: 'token',
  content: [],
  breadcrumbs: [{ label: 'Posts', url: '/admin/posts' }, { label: 'List' }],
} as unknown as PageSchema

beforeAll(() => {
  // vue-sonner's toaster reads the colour scheme.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
})

afterEach(() => setPageProps({ alfakit: panel, page: undefined, alfakitNavigation: undefined }))

describe('starter kit mode', () => {
  it('puts the page in the host layout, then the Alfakit root', () => {
    const Page = createStarterKitPage({ layout: HostLayout })
    const layouts = Page.layout({ page }) as [unknown, Record<string, unknown>][]

    expect(layouts).toHaveLength(2)
    expect(layouts[0]![0]).toBe(HostLayout)
    expect(layouts[0]![1]).toEqual({
      breadcrumbs: [
        { title: 'Posts', href: '/admin/posts' },
        { title: 'List', href: '' },
      ],
    })
    expect(layouts[1]![0]).toBe(AlfakitStarterKitRoot)
    expect(createStarterKitPage({ layout: null }).layout({ page })).toHaveLength(1)
    // Sign-in and the other `auth` pages stand on their own, like the host's auth pages.
    const auth = Page.layout({ page: { ...page, layout: 'auth' } }) as [unknown, unknown][]
    expect(auth).toHaveLength(1)
    expect(auth[0]![0]).toBe(AlfakitStarterKitRoot)
  })

  it('renders the page content without Alfakit chrome', async () => {
    setPageProps({ alfakit: { ...panel, starterKit: true }, page } as Partial<AlfakitPageProps>)
    const Page = createStarterKitPage({ layout: HostLayout })
    const [[, layoutProps]] = Page.layout({ page }) as [[unknown, Record<string, unknown>]]

    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(HostLayout, layoutProps, () => h(AlfakitStarterKitRoot, null, () => h(Page))),
      }),
      { attachTo: document.body },
    )
    await flush()

    expect(wrapper.find('[data-testid="host-layout"]').exists()).toBe(true)
    expect(wrapper.find('nav[aria-label="breadcrumb"]').text()).toBe('Posts / List')
    expect(wrapper.find('h1').text()).toBe('Posts')
    expect(wrapper.find('[data-alfakit-embedded][data-slot="content"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="topbar"]').exists()).toBe(false)
    expect(wrapper.find('[data-sidebar="sidebar"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('renders a fullscreen page in the host layout without the fullscreen header (W-V3-24)', async () => {
    const fullscreen = {
      ...page,
      layout: 'fullscreen',
      fullscreen: { exitUrl: '/admin' },
    } as unknown as PageSchema
    setPageProps({
      alfakit: { ...panel, starterKit: true },
      page: fullscreen,
    } as Partial<AlfakitPageProps>)
    const Page = createStarterKitPage({ layout: HostLayout })
    const [[, layoutProps]] = Page.layout({ page: fullscreen }) as [
      [unknown, Record<string, unknown>],
    ]

    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(HostLayout, layoutProps, () => h(AlfakitStarterKitRoot, null, () => h(Page))),
      }),
      { attachTo: document.body },
    )
    await flush()
    await new Promise((resolve) => setTimeout(resolve, 50))
    await flush()

    expect(wrapper.find('[data-alfakit-embedded][data-layout="fullscreen"]').exists()).toBe(true)
    // The host layout is the chrome: no AlfaKit brand, top bar slots, user menu or Exit.
    expect(wrapper.find('[data-slot="topbar"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="fullscreen-exit"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('mirrors only its own content in a right-to-left language, never the host document', async () => {
    document.documentElement.dir = 'ltr'
    document.documentElement.lang = 'en'
    setPageProps({
      alfakit: {
        ...panel,
        starterKit: true,
        localization: { code: 'ar', tag: 'ar', direction: 'rtl', locales: [] },
      },
      page,
    } as unknown as Partial<AlfakitPageProps>)
    const Page = createStarterKitPage({ layout: HostLayout })

    const wrapper = mount(
      defineComponent({
        setup: () => () => h(HostLayout, null, () => h(AlfakitStarterKitRoot, null, () => h(Page))),
      }),
      { attachTo: document.body },
    )
    await flush()

    // The host's sidebar and its own pages are not right to left: <html> stays the host's.
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
    expect(document.documentElement.getAttribute('lang')).toBe('en')
    const root = wrapper.find('[data-slot="starter-kit-root"]')
    expect(root.attributes('dir')).toBe('rtl')
    expect(root.attributes('lang')).toBe('ar')
    expect(root.find('[data-slot="content"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it("puts toasts in the host document's top-right corner in a right-to-left language, not over the kit's sidebar (W-D-03)", async () => {
    document.documentElement.dir = 'ltr'
    setPageProps({
      alfakit: {
        ...panel,
        starterKit: true,
        localization: { code: 'ar', tag: 'ar', direction: 'rtl', locales: [] },
      },
      page,
    } as unknown as Partial<AlfakitPageProps>)
    const Page = createStarterKitPage({ layout: HostLayout })

    const wrapper = mount(
      defineComponent({
        setup: () => () => h(HostLayout, null, () => h(AlfakitStarterKitRoot, null, () => h(Page))),
      }),
      { attachTo: document.body },
    )
    await flush()

    showToast({ id: 'kit-rtl', title: 'تم الحفظ', status: 'success' } as never)
    await new Promise((resolve) => setTimeout(resolve, 50))
    await flush()

    const toast = Array.from(document.querySelectorAll('[data-sonner-toast]')).find((item) =>
      item.textContent?.includes('تم الحفظ'),
    )
    const toaster = toast?.closest('[data-sonner-toaster]')
    expect(toaster?.getAttribute('data-x-position')).toBe('right')
    expect(toaster?.getAttribute('dir')).toBe('rtl')

    wrapper.unmount()
  })

  it('gives portaled modals the reading direction (they render outside its root)', async () => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(ConfigProvider, { dir: 'rtl' }, () =>
            h(Dialog, { open: true }, () =>
              h(DialogContent, { 'aria-describedby': undefined }, () =>
                h(DialogTitle, null, () => 'Edit'),
              ),
            ),
          ),
      }),
      { attachTo: document.body },
    )
    await flush()

    expect(document.querySelector('[data-slot="dialog-content"]')?.getAttribute('dir')).toBe('rtl')

    wrapper.unmount()
  })

  it('reads the shared navigation for the host sidebar', () => {
    setPageProps({
      alfakitNavigation: [
        {
          id: 'admin',
          url: '/admin',
          brandName: 'Admin',
          groups: [
            {
              label: 'Blog',
              collapsible: true,
              items: [{ label: 'Posts', url: '/admin/posts', active: true }],
            },
          ],
          userMenu: [{ label: 'Billing', icon: 'credit-card', url: '/admin/billing' }],
        },
      ],
    } as Partial<AlfakitPageProps>)

    const navigation = useAlfakitNavigation()

    expect(navigation.value.navigation?.id).toBe('admin')
    expect(navigation.value.groups[0]!.items[0]).toMatchObject({
      title: 'Posts',
      href: '/admin/posts',
      isActive: true,
    })
    expect(navigation.value.userMenuItems).toMatchObject([
      { title: 'Billing', href: '/admin/billing', icon: 'credit-card' },
    ])
    expect(useAlfakitNavigation('other').value.groups).toEqual([])
  })
})
