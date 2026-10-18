import type { PanelSchema } from '@alfakit/core'
import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { panel, setPageProps } from './mocks'
import SidebarHarness from './SidebarHarness.svelte'

function renderSidebar(navigation: PanelSchema['navigation']) {
  setPageProps({ alfakit: { ...panel, sidebarCollapsibleOnDesktop: true, navigation } })

  return render(SidebarHarness, { props: { open: false } })
}

afterEach(() => setPageProps({ alfakit: panel }))

describe('navigation group flyouts in the collapsed sidebar', () => {
  it('turns a group with an icon into a flyout button listing its items', async () => {
    const { container } = renderSidebar([
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

    const flyout = container.querySelector('[data-nav-flyout]') as HTMLElement

    expect(flyout.className).toContain('group-data-[collapsible=icon]:flex')

    const trigger = within(flyout).getByRole('button', { name: 'Shop' })

    expect(trigger).toHaveAttribute('data-active', 'true')
    await fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' })

    const menu = await screen.findByRole('menu')
    const links = within(menu).getAllByRole('menuitem')

    expect(links.map((link) => link.textContent?.replace(/\s+/g, ''))).toEqual([
      'Orders',
      'Returns',
      'Products4',
    ])
    expect(links[0]).toHaveAttribute('aria-current', 'page')
    expect(links[1]!.className).toContain('ps-6')
  })

  it('keeps groups without an icon as they are', () => {
    const { container } = renderSidebar([
      { label: 'Shop', collapsible: false, items: [{ label: 'Orders', url: '/o' }] },
    ])

    expect(container.querySelector('[data-nav-flyout]')).toBeNull()
  })
})
