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

  it('renders items as links, new-tab ones in a new tab, at every nested level', async () => {
    const { container } = renderSidebar([
      {
        label: 'Help',
        icon: 'life-buoy',
        collapsible: true,
        items: [
          { label: 'Docs', url: 'https://docs.example.test', openInNewTab: true },
          {
            label: 'Guides',
            children: [
              {
                label: 'Setup',
                url: '/setup',
                children: [{ label: 'Advanced', url: '/advanced' }],
              },
            ],
          },
        ],
      },
    ])

    const flyout = container.querySelector('[data-nav-flyout]') as HTMLElement

    await fireEvent.pointerDown(within(flyout).getByRole('button', { name: 'Help' }), {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse',
    })

    const links = within(await screen.findByRole('menu')).getAllByRole('menuitem')

    // Real anchors (middle click, copy link); "Guides" has no URL, so it is a heading.
    expect(links.map((link) => link.tagName)).toEqual(['A', 'A', 'A'])
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://docs.example.test',
      '/setup',
      '/advanced',
    ])
    expect(links[0]).toHaveAttribute('target', '_blank')
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer')
    expect(links[2]!.className).toContain('ps-9')
  })

  it('keeps groups without an icon as they are', () => {
    const { container } = renderSidebar([
      { label: 'Shop', collapsible: false, items: [{ label: 'Orders', url: '/o' }] },
    ])

    expect(container.querySelector('[data-nav-flyout]')).toBeNull()
  })
})
