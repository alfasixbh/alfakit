import type { PanelSchema } from '@alfakit/core'
import { flushPromises } from '@vue/test-utils'
import { h } from 'vue'
import AppSidebar from '../src/components/panel/AppSidebar.vue'
import SidebarProvider from '../src/components/ui/SidebarProvider.vue'
import { mountWithAlfakit, panel, setPageProps } from './mocks'

function mountSidebar(navigation: PanelSchema['navigation']) {
  setPageProps({ alfakit: { ...panel, sidebarCollapsibleOnDesktop: true, navigation } })

  return mountWithAlfakit(() => h(SidebarProvider, { defaultOpen: false }, () => [h(AppSidebar)]), {
    attachTo: document.body,
  })
}

afterEach(() => {
  setPageProps({ alfakit: panel })
  document.body.innerHTML = ''
})

describe('navigation group flyouts in the collapsed sidebar', () => {
  it('turns a group with an icon into a flyout button listing its items', async () => {
    const wrapper = mountSidebar([
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

    const flyout = wrapper.find('[data-nav-flyout]')

    expect(flyout.classes()).toContain('group-data-[collapsible=icon]:flex')

    const trigger = flyout.find('button')

    expect(trigger.text()).toBe('Shop')
    expect(trigger.attributes('data-active')).toBe('true')

    await trigger.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    const menu = document.querySelector('[role="menu"]')!
    const links = [...menu.querySelectorAll('[role="menuitem"]')]

    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Orders',
      'Returns',
      'Products4',
    ])
    expect(links[0]!.getAttribute('aria-current')).toBe('page')
    expect(links[1]!.className).toContain('ps-6')
    wrapper.unmount()
  })

  it('keeps groups without an icon as they are', () => {
    const wrapper = mountSidebar([
      { label: 'Shop', collapsible: false, items: [{ label: 'Orders', url: '/o' }] },
    ])

    expect(wrapper.find('[data-nav-flyout]').exists()).toBe(false)
    wrapper.unmount()
  })
})
