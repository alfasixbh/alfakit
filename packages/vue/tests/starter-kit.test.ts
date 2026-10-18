import type { AlfakitPageProps, PageSchema } from '@alfakit/core'
import { mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { defineComponent, h, type PropType } from 'vue'
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
    expect(useAlfakitNavigation('other').value.groups).toEqual([])
  })
})
