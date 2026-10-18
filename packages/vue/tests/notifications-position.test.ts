import { h } from 'vue'
import AppSidebar from '../src/components/panel/AppSidebar.vue'
import Topbar from '../src/components/panel/Topbar.vue'
import SidebarProvider from '../src/components/ui/SidebarProvider.vue'
import { mountWithAlfakit, panel, setPageProps } from './mocks'

function mountChrome(position?: 'sidebar', open = true) {
  setPageProps({
    alfakit: {
      ...panel,
      sidebarCollapsibleOnDesktop: true,
      databaseNotifications: { unreadCount: 3, ...(position ? { position } : {}) },
    },
  })

  return mountWithAlfakit(() =>
    h(SidebarProvider, { defaultOpen: open }, () => [h(AppSidebar), h(Topbar)]),
  )
}

afterEach(() => setPageProps({ alfakit: panel }))

describe('database notifications position', () => {
  it('keeps the bell in the top bar by default', () => {
    const wrapper = mountChrome()

    const triggers = wrapper.findAll('[data-slot="notifications-trigger"]')
    expect(triggers).toHaveLength(1)
    expect(triggers[0]!.element.closest('[data-slot="topbar"]')).not.toBeNull()
    wrapper.unmount()
  })

  it('moves the bell into the sidebar and out of the top bar', () => {
    const wrapper = mountChrome('sidebar')

    const triggers = wrapper.findAll('[data-slot="notifications-trigger"]')
    expect(triggers).toHaveLength(1)
    expect(triggers[0]!.element.closest('[data-slot="topbar"]')).toBeNull()
    expect(triggers[0]!.attributes('data-variant')).toBe('sidebar')
    expect(triggers[0]!.text()).toContain('Notifications')
    expect(triggers[0]!.text()).toContain('3')
    wrapper.unmount()
  })

  it('keeps the badge and an accessible name in a collapsed sidebar', () => {
    const wrapper = mountChrome('sidebar', false)

    const trigger = wrapper.find('[data-variant="sidebar"]')
    expect(trigger.element.closest('[data-collapsible="icon"]')).not.toBeNull()
    expect(trigger.classes()).toContain('group-data-[collapsible=icon]:size-8')
    expect(trigger.find('.group-data-\\[collapsible\\=icon\\]\\:sr-only').text()).toBe(
      'Notifications',
    )
    expect(trigger.text()).toContain('3')
    wrapper.unmount()
  })
})
