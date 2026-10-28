import type { SchemaComponent, SubNavigationSchema } from '@alfakit/core'
import { ActionRunner, Translator, sidebarWidthStyle } from '@alfakit/core'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MenuItemEntry } from '../src/components/panel/menu-item'
import { SubNavigationLayout } from '../src/components/panel/sub-navigation'
import { RenderComponent, SchemaRenderer } from '../src/components/schema/schema-renderer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../src/components/ui/dropdown-menu'
import { TooltipProvider } from '../src/components/ui/tooltip'
import { AlfakitProvider } from '../src/context'
import { AuthLayout } from '../src/layouts/auth-layout'
import { Icon } from '../src/lib/icons'
import { createDefaultRegistry } from '../src/registry'
import { Wrapper, panel, setPageProps } from './mocks'

const component = (schema: Record<string, unknown>) => schema as unknown as SchemaComponent

describe('layout components', () => {
  it('renders a Flex row from its breakpoint and keeps non-growing children narrow', () => {
    const { container } = render(
      <Wrapper>
        <RenderComponent
          component={component({
            type: 'Flex',
            key: 'flex',
            from: 'md',
            verticalAlignment: 'center',
            schema: [
              { type: 'Text', key: 'a', content: 'Main' },
              { type: 'Text', key: 'b', content: 'Side', grow: false },
            ],
          })}
        />
      </Wrapper>,
    )

    const flex = container.querySelector('[data-slot="flex"]')!
    expect(flex.className).toContain('md:flex-row')
    expect(flex.className).toContain('md:items-center')
    const items = container.querySelectorAll('[data-slot="flex-item"]')
    expect(items[0]!.className).toContain('flex-1')
    expect(items[1]!.className).toContain('shrink-0')
    expect(screen.getByText('Side')).toBeInTheDocument()
  })

  it('renders a callout with escaped HTML from the server and its colour', () => {
    const { container } = render(
      <Wrapper>
        <RenderComponent
          component={component({
            type: 'Callout',
            key: 'c',
            heading: 'Payment overdue',
            description: 'Pay &lt;b&gt;now&lt;/b&gt;',
            color: 'warning',
          })}
        />
      </Wrapper>,
    )

    const callout = container.querySelector('[data-slot="callout"]')!
    expect(callout).toHaveAttribute('data-color', 'warning')
    expect(callout).toHaveAttribute('role', 'alert')
    expect(screen.getByText('Payment overdue')).toBeInTheDocument()
    expect(screen.getByText('Pay <b>now</b>')).toBeInTheDocument()
    expect(callout.querySelector('b')).toBeNull()
  })

  it('renders an empty state with its actions', () => {
    const { container } = render(
      <Wrapper>
        <RenderComponent
          component={component({
            type: 'EmptyState',
            key: 'e',
            heading: 'No orders yet',
            contained: true,
            actions: [{ type: 'Action', name: 'import', label: 'Import orders', url: '/import' }],
          })}
        />
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="empty-state"]')!.className).toContain(
      'border-dashed',
    )
    expect(screen.getByRole('heading', { name: 'No orders yet' })).toBeInTheDocument()
    expect(screen.getByText('Import orders')).toBeInTheDocument()
  })

  it('renders images, icons and unordered lists', () => {
    const { container } = render(
      <Wrapper>
        <RenderComponent
          component={component({
            type: 'Image',
            key: 'i',
            url: '/chart.png',
            alt: 'Sales chart',
            imageHeight: '12rem',
            alignment: 'center',
          })}
        />
        <RenderComponent
          component={component({ type: 'Icon', key: 'star', icon: 'star', tooltip: 'Starred' })}
        />
        <RenderComponent
          component={component({
            type: 'UnorderedList',
            key: 'l',
            schema: [
              { type: 'Text', key: 'one', content: 'First' },
              { type: 'Text', key: 'two', content: 'Second' },
            ],
          })}
        />
      </Wrapper>,
    )

    const image = screen.getByRole('img', { name: 'Sales chart' })
    expect(image).toHaveAttribute('src', '/chart.png')
    expect(image.style.height).toBe('12rem')
    expect(container.querySelector('[data-slot="image"]')!.className).toContain('justify-center')
    expect(screen.getByRole('img', { name: 'Starred' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('wraps grids with container breakpoints in an @container', () => {
    const { container } = render(
      <Wrapper>
        <SchemaRenderer
          components={[
            component({ type: 'Text', key: 'a', content: 'A', columnSpan: { '@md': 2 } }),
          ]}
          columns={{ default: 1, '@md': 3 }}
        />
        <SchemaRenderer components={[]} columns={{ default: 1, md: 3 }} />
      </Wrapper>,
    )

    const wrappers = container.querySelectorAll('[data-slot="schema-container"]')
    expect(wrappers).toHaveLength(1)
    expect(wrappers[0]!.className).toBe('@container')
    expect(wrappers[0]!.querySelector('[data-slot="schema"]')!.className).toContain(
      '@md:grid-cols-3',
    )
    expect(container.querySelector('[data-slot="schema-item"]')!.className).toContain(
      '@md:col-span-2',
    )
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

  it.each(['start', 'end', 'top'] as const)(
    'renders %s navigation with the current page marked',
    (position) => {
      const { container } = render(
        <Wrapper>
          <SubNavigationLayout navigation={navigation(position)}>
            <p>Body</p>
          </SubNavigationLayout>
        </Wrapper>,
      )

      const nav = screen.getByRole('navigation', { name: 'Page navigation' })
      expect(nav).toHaveAttribute('data-position', position)
      expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('aria-current', 'page')
      expect(screen.getByRole('link', { name: 'Edit' })).not.toHaveAttribute('aria-current')
      expect(screen.getByText('Body')).toBeInTheDocument()
      expect(!!container.querySelector('[data-slot="sub-navigation-layout"]')).toBe(
        position !== 'top',
      )

      if (position !== 'top') {
        // Beside the content only when the page's content area is wide enough (`@container`).
        const layout = container.querySelector('[data-slot="sub-navigation-layout"]')!
        expect(layout).toHaveClass('flex-col', '@2xl:flex-row')
        expect(layout).not.toHaveClass('md:flex-row')
        expect(layout.parentElement).toHaveClass('@container')
        expect(nav).toHaveClass('flex-row', 'overflow-x-auto', '@2xl:flex-col', '@2xl:w-56')
      }
    },
  )
})

describe('navigation icons', () => {
  it('draws legacy Lucide names in navigation groups, their items and menu items', async () => {
    render(
      <Wrapper>
        <SubNavigationLayout
          navigation={{
            position: 'start',
            groups: [
              {
                label: 'Shop',
                icon: 'home',
                collapsible: false,
                items: [{ label: 'Filters', url: '/filters', icon: 'filter' }],
              },
            ],
          }}
        >
          <p>Body</p>
        </SubNavigationLayout>
        <DropdownMenu open>
          <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <MenuItemEntry item={{ label: 'Bin', url: '/bin', icon: 'trash-2' }} />
          </DropdownMenuContent>
        </DropdownMenu>
      </Wrapper>,
    )

    await waitFor(() => {
      expect(document.querySelector('svg.lucide-house')).not.toBeNull()
      expect(document.querySelector('svg.lucide-funnel')).not.toBeNull()
      expect(
        screen.getByRole('menuitem', { name: 'Bin' }).querySelector('svg.lucide-trash-2'),
      ).not.toBeNull()
    })
  })
})

describe('panel options', () => {
  it('maps sidebar widths to the sidebar CSS variables', () => {
    expect(sidebarWidthStyle({ sidebarWidth: '20rem', collapsedSidebarWidth: '4rem' })).toEqual({
      '--sidebar-width': '20rem',
      '--sidebar-width-icon': '4rem',
    })
    expect(sidebarWidthStyle({})).toBeUndefined()
  })

  it('sizes simple pages with simplePageMaxContentWidth', () => {
    setPageProps({ alfakit: { ...panel, simplePageMaxContentWidth: '2xl' } })

    const { container } = render(
      <Wrapper>
        <AuthLayout heading="Sign in">
          <p>Form</p>
        </AuthLayout>
      </Wrapper>,
    )

    expect(container.querySelector('.max-w-2xl')).not.toBeNull()
    setPageProps({ alfakit: panel })
  })

  it('renders named icons with the registered panel:icon component', () => {
    const registry = createDefaultRegistry().register(
      'panel:icon',
      ({ name }: { name: string }) => <i data-testid="custom-icon">{name}</i>,
    )
    const CustomWrapper = ({ children }: { children: ReactNode }) => (
      <AlfakitProvider
        value={{
          registry,
          pages: {},
          actions: new ActionRunner({ endpoints: { action: '/a', modal: '/m' } }),
          translator: new Translator({}),
        }}
      >
        <TooltipProvider>{children}</TooltipProvider>
      </AlfakitProvider>
    )

    render(
      <CustomWrapper>
        <Icon name="trash-2" />
      </CustomWrapper>,
    )

    expect(screen.getByTestId('custom-icon')).toHaveTextContent('trash-2')
  })
})
