import type { SchemaComponent, SubNavigationSchema } from '@alfakit/core'
import { Translator } from '@alfakit/core'
import { defineComponent, h } from 'vue'
import MenuItemEntry from '../src/components/panel/MenuItemEntry.vue'
import SubNavigationLayout from '../src/components/panel/SubNavigationLayout.vue'
import RenderComponent from '../src/components/schema/RenderComponent.vue'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import DropdownMenu from '../src/components/ui/DropdownMenu.vue'
import DropdownMenuContent from '../src/components/ui/DropdownMenuContent.vue'
import DropdownMenuTrigger from '../src/components/ui/DropdownMenuTrigger.vue'
import { ALFAKIT_KEY } from '../src/context'
import AuthLayout from '../src/layouts/AuthLayout.vue'
import { Icon } from '../src/lib/icons'
import { createDefaultRegistry } from '../src/registry'
import { actions, mountWithAlfakit, panel, setPageProps } from './mocks'

const component = (schema: Record<string, unknown>) => schema as unknown as SchemaComponent

describe('layout components', () => {
  it('renders a Flex row and keeps non-growing children narrow', () => {
    const wrapper = mountWithAlfakit(() =>
      h(RenderComponent, {
        component: component({
          type: 'Flex',
          key: 'flex',
          from: 'md',
          schema: [
            { type: 'Text', key: 'a', content: 'Main' },
            { type: 'Text', key: 'b', content: 'Side', grow: false },
          ],
        }),
      }),
    )

    expect(wrapper.find('[data-slot="flex"]').classes()).toContain('md:flex-row')
    const items = wrapper.findAll('[data-slot="flex-item"]')
    expect(items[0]!.classes()).toContain('flex-1')
    expect(items[1]!.classes()).toContain('shrink-0')
    wrapper.unmount()
  })

  it('renders callouts and empty states with server-escaped descriptions', () => {
    const wrapper = mountWithAlfakit(() => [
      h(RenderComponent, {
        component: component({
          type: 'Callout',
          key: 'c',
          heading: 'Overdue',
          description: 'Pay &lt;b&gt;now&lt;/b&gt;',
          color: 'danger',
        }),
      }),
      h(RenderComponent, {
        component: component({
          type: 'EmptyState',
          key: 'e',
          heading: 'No orders',
          contained: true,
        }),
      }),
    ])

    const callout = wrapper.find('[data-slot="callout"]')
    expect(callout.attributes('role')).toBe('alert')
    expect(callout.text()).toContain('Pay <b>now</b>')
    expect(callout.find('b').exists()).toBe(false)
    expect(wrapper.find('[data-slot="empty-state"]').classes()).toContain('border-dashed')
    expect(wrapper.find('h3').text()).toBe('No orders')
    wrapper.unmount()
  })

  it('renders images and unordered lists', () => {
    const wrapper = mountWithAlfakit(() => [
      h(RenderComponent, {
        component: component({
          type: 'Image',
          key: 'i',
          url: '/a.png',
          alt: 'Chart',
          imageHeight: '8rem',
        }),
      }),
      h(RenderComponent, {
        component: component({
          type: 'UnorderedList',
          key: 'l',
          schema: [
            { type: 'Text', key: 'one', content: 'First' },
            { type: 'Text', key: 'two', content: 'Second' },
          ],
        }),
      }),
    ])

    const image = wrapper.find('img')
    expect(image.attributes('alt')).toBe('Chart')
    expect((image.element as HTMLImageElement).style.height).toBe('8rem')
    expect(wrapper.findAll('li')).toHaveLength(2)
    wrapper.unmount()
  })

  it('wraps container-query grids in an @container', () => {
    const wrapper = mountWithAlfakit(() =>
      h(SchemaRenderer, { components: [], columns: { default: 1, '@md': 3 } }),
    )

    const container = wrapper.find('[data-slot="schema-container"]')
    expect(container.classes()).toContain('@container')
    expect(container.find('[data-slot="schema"]').classes()).toContain('@md:grid-cols-3')
    wrapper.unmount()
  })
})

describe('sub-navigation', () => {
  const navigation = (position: SubNavigationSchema['position']): SubNavigationSchema => ({
    position,
    groups: [
      {
        collapsible: false,
        items: [
          { label: 'View', url: '/users/1', active: true },
          { label: 'Edit', url: '/users/1/edit' },
        ],
      },
    ],
  })

  it.each(['start', 'end', 'top'] as const)('renders %s navigation', (position) => {
    const wrapper = mountWithAlfakit(() =>
      h(SubNavigationLayout, { navigation: navigation(position) }, () => h('p', 'Body')),
    )

    const nav = wrapper.find('nav[aria-label="Page navigation"]')
    expect(nav.attributes('data-position')).toBe(position)
    expect(wrapper.find('[aria-current="page"]').text()).toBe('View')
    expect(wrapper.text()).toContain('Body')
    expect(wrapper.find('[data-slot="sub-navigation-layout"]').exists()).toBe(position !== 'top')

    if (position !== 'top') {
      // Beside the content only when the page's content area is wide enough (`@container`).
      const layout = wrapper.find('[data-slot="sub-navigation-layout"]')
      expect(layout.classes()).toEqual(expect.arrayContaining(['flex-col', '@2xl:flex-row']))
      expect(layout.classes()).not.toContain('md:flex-row')
      expect(layout.element.parentElement!.classList).toContain('@container')
      expect(nav.classes()).toEqual(
        expect.arrayContaining(['flex-row', 'overflow-x-auto', '@2xl:flex-col', '@2xl:w-56']),
      )
    }
    wrapper.unmount()
  })
})

describe('navigation icons', () => {
  it('draws legacy Lucide names in navigation groups, their items and menu items', async () => {
    const wrapper = mountWithAlfakit(() => [
      h(
        SubNavigationLayout,
        {
          navigation: {
            position: 'start',
            groups: [
              {
                label: 'Shop',
                icon: 'home',
                collapsible: false,
                items: [{ label: 'Filters', url: '/filters', icon: 'filter' }],
              },
            ],
          },
        },
        () => h('p', 'Body'),
      ),
      h(DropdownMenu, { open: true }, () => [
        h(DropdownMenuTrigger, null, () => 'Menu'),
        h(DropdownMenuContent, null, () =>
          h(MenuItemEntry, { item: { label: 'Bin', url: '/bin', icon: 'trash-2' } }),
        ),
      ]),
    ])

    await vi.waitFor(() => {
      expect(document.querySelector('svg.lucide-house')).not.toBeNull()
      expect(document.querySelector('svg.lucide-funnel')).not.toBeNull()
      expect(document.querySelector('[role="menuitem"] svg.lucide-trash-2')).not.toBeNull()
    })
    wrapper.unmount()
  })
})

describe('panel options', () => {
  it('sizes simple pages with simplePageMaxContentWidth', () => {
    setPageProps({ alfakit: { ...panel, simplePageMaxContentWidth: '2xl' } })

    const wrapper = mountWithAlfakit(() => h(AuthLayout, { heading: 'Sign in' }, () => 'Form'))

    expect(wrapper.find('.max-w-2xl').exists()).toBe(true)
    wrapper.unmount()
    setPageProps({ alfakit: panel })
  })

  it('renders named icons with the registered panel:icon component', () => {
    const registry = createDefaultRegistry().register(
      'panel:icon',
      defineComponent({
        props: { name: String },
        setup: (props) => () => h('i', { 'data-testid': 'custom' }, props.name),
      }),
    )

    const wrapper = mountWithAlfakit(() => h(Icon, { name: 'trash-2' }), {
      global: {
        provide: {
          [ALFAKIT_KEY as symbol]: { registry, pages: {}, actions, translator: new Translator({}) },
        },
      },
    })

    expect(wrapper.find('[data-testid="custom"]').text()).toBe('trash-2')
    wrapper.unmount()
  })
})
