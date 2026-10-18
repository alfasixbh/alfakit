import type { PanelSchema } from '@alfakit/core'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { AppSidebar } from '../src/components/panel/app-sidebar'
import { SidebarProvider } from '../src/components/ui/sidebar'
import { Wrapper, panel, setPageProps } from './mocks'

const withNavigation = (navigation: PanelSchema['navigation']) =>
  setPageProps({ alfakit: { ...panel, sidebarCollapsibleOnDesktop: true, navigation } })

afterEach(() => setPageProps({ alfakit: panel, page: undefined }))

const renderSidebar = () =>
  render(
    <Wrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
      </SidebarProvider>
    </Wrapper>,
  )

describe('navigation group flyouts in the collapsed sidebar', () => {
  it('turns a group with an icon into a flyout button listing its items', () => {
    withNavigation([
      {
        label: 'Shop',
        icon: 'shopping-cart',
        collapsible: true,
        collapsed: true,
        items: [
          {
            label: 'Orders',
            url: '/orders',
            active: true,
            children: [{ label: 'Returns', url: '/returns' }],
          },
          { label: 'Products', url: '/products', badge: 4 },
        ],
      },
    ])

    const { container } = renderSidebar()
    const flyout = container.querySelector('[data-nav-flyout]')!

    // Only shown by CSS in the icon-only sidebar; present even for a collapsed group.
    expect(flyout.className).toContain('group-data-[collapsible=icon]:flex')

    const trigger = within(flyout as HTMLElement).getByRole('button', { name: 'Shop' })

    expect(trigger).toHaveAttribute('data-active', 'true')
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' })

    const menu = screen.getByRole('menu')
    const links = within(menu).getAllByRole('menuitem')

    expect(links.map((link) => link.textContent)).toEqual(['Orders', 'Returns', 'Products4'])
    expect(links[0]).toHaveAttribute('aria-current', 'page')
    expect(links[1]!.className).toContain('ps-6')
  })

  it('keeps groups without an icon as they are', () => {
    withNavigation([{ label: 'Shop', collapsible: false, items: [{ label: 'Orders', url: '/o' }] }])

    const { container } = renderSidebar()

    expect(container.querySelector('[data-nav-flyout]')).toBeNull()
  })
})
