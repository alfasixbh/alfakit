import type { SchemaComponent, SubNavigationSchema } from '@alfakit/core'
import { render, screen } from '@testing-library/svelte'
import RenderComponent from '../src/components/schema/RenderComponent.svelte'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.svelte'
import AuthHarness from './AuthHarness.svelte'
import IconHarness from './IconHarness.svelte'
import { panel, setPageProps } from './mocks'
import NavigationIconsHarness from './NavigationIconsHarness.svelte'
import SubNavigationHarness from './SubNavigationHarness.svelte'
import Wrapper from './Wrapper.svelte'

const component = (schema: Record<string, unknown>) => schema as unknown as SchemaComponent

function renderComponent(schema: Record<string, unknown>) {
  return render(Wrapper, {
    props: { component: RenderComponent, props: { component: component(schema) } },
  })
}

describe('layout components', () => {
  it('renders a Flex row and keeps non-growing children narrow', () => {
    const { container } = renderComponent({
      type: 'Flex',
      key: 'flex',
      from: 'md',
      schema: [
        { type: 'Text', key: 'a', content: 'Main' },
        { type: 'Text', key: 'b', content: 'Side', grow: false },
      ],
    })

    expect(container.querySelector('[data-slot="flex"]')!.className).toContain('md:flex-row')
    const items = container.querySelectorAll('[data-slot="flex-item"]')
    expect(items[0]!.className).toContain('flex-1')
    expect(items[1]!.className).toContain('shrink-0')
  })

  it('renders a callout with a server-escaped description', () => {
    const { container } = renderComponent({
      type: 'Callout',
      key: 'c',
      heading: 'Overdue',
      description: 'Pay &lt;b&gt;now&lt;/b&gt;',
      color: 'warning',
    })

    const callout = container.querySelector('[data-slot="callout"]')!
    expect(callout).toHaveAttribute('role', 'alert')
    expect(screen.getByText('Pay <b>now</b>')).toBeInTheDocument()
    expect(callout.querySelector('b')).toBeNull()
  })

  it('renders an empty state', () => {
    const { container } = renderComponent({
      type: 'EmptyState',
      key: 'e',
      heading: 'No orders',
      contained: true,
    })

    expect(container.querySelector('[data-slot="empty-state"]')!.className).toContain(
      'border-dashed',
    )
    expect(screen.getByRole('heading', { name: 'No orders' })).toBeInTheDocument()
  })

  it('renders images and unordered lists', () => {
    renderComponent({ type: 'Image', key: 'i', url: '/a.png', alt: 'Chart', imageHeight: '8rem' })
    renderComponent({
      type: 'UnorderedList',
      key: 'l',
      schema: [
        { type: 'Text', key: 'one', content: 'First' },
        { type: 'Text', key: 'two', content: 'Second' },
      ],
    })

    const image = screen.getByRole('img', { name: 'Chart' }) as HTMLImageElement
    expect(image.style.height).toBe('8rem')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('wraps container-query grids in an @container', () => {
    const { container } = render(Wrapper, {
      props: {
        component: SchemaRenderer,
        props: { components: [], columns: { default: 1, '@md': 3 } },
      },
    })

    const wrapper = container.querySelector('[data-slot="schema-container"]')!
    expect(wrapper.className).toBe('@container')
    expect(wrapper.querySelector('[data-slot="schema"]')!.className).toContain('@md:grid-cols-3')
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
    const { container } = render(SubNavigationHarness, {
      props: { navigation: navigation(position) },
    })

    expect(screen.getByRole('navigation', { name: 'Page navigation' })).toHaveAttribute(
      'data-position',
      position,
    )
    expect(container.querySelector('[aria-current="page"]')).toHaveTextContent('View')
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(!!container.querySelector('[data-slot="sub-navigation-layout"]')).toBe(
      position !== 'top',
    )
  })
})

describe('navigation icons', () => {
  it('draws legacy Lucide names in navigation groups, their items and menu items', async () => {
    render(NavigationIconsHarness, {
      props: {
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
        item: { label: 'Bin', url: '/bin', icon: 'trash-2' },
      },
    })

    await vi.waitFor(() => {
      expect(document.querySelector('svg[data-icon="home"]')).not.toBeNull()
      expect(document.querySelector('svg[data-icon="filter"]')).not.toBeNull()
      expect(document.querySelector('[role="menuitem"] svg[data-icon="trash-2"]')).not.toBeNull()
    })
  })
})

describe('panel options', () => {
  it('sizes simple pages with simplePageMaxContentWidth', () => {
    setPageProps({ alfakit: { ...panel, simplePageMaxContentWidth: '2xl' } })

    const { container } = render(AuthHarness)

    expect(container.querySelector('.max-w-2xl')).not.toBeNull()
    setPageProps({ alfakit: panel })
  })

  it('renders named icons with the registered panel:icon component', () => {
    render(IconHarness)

    expect(screen.getByTestId('custom-icon')).toHaveTextContent('trash-2')
  })
})
