import type { PanelSchema } from '@alfakit/core'
import { flushPromises } from '@vue/test-utils'
import { h } from 'vue'
import AppSidebar from '../src/components/panel/AppSidebar.vue'
import SidebarProvider from '../src/components/ui/SidebarProvider.vue'
import { mountWithAlfakit, panel, setPageProps } from './mocks'

// W-V1-05: a parent item's button sits in `CollapsibleTrigger as-child` and has a tooltip;
// the trigger's click handler and ARIA attributes must reach the rendered button.
function mountSidebar(navigation: PanelSchema['navigation']) {
  setPageProps({ alfakit: { ...panel, navigation } })

  return mountWithAlfakit(() => h(SidebarProvider, { defaultOpen: true }, () => [h(AppSidebar)]), {
    attachTo: document.body,
  })
}

afterEach(() => {
  setPageProps({ alfakit: panel })
  document.body.innerHTML = ''
})

describe('navigation items with children', () => {
  it('opens and closes the sub-menu from the parent item', async () => {
    const wrapper = mountSidebar([
      {
        label: null,
        collapsible: false,
        items: [
          {
            label: 'Docs',
            url: '/docs',
            extraAttributes: { 'data-test': 'docs' },
            children: [{ label: 'API', url: '/docs/api' }],
          },
        ],
      },
    ])

    const button = wrapper.find('[data-slot="sidebar-menu-button"][data-test="docs"]')

    expect(button.exists()).toBe(true)
    expect(button.attributes('aria-expanded')).toBe('false')

    await button.trigger('click')
    await flushPromises()

    expect(button.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-slot="sidebar-menu-sub"]').text()).toContain('API')

    await button.trigger('click')
    await flushPromises()

    expect(button.attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })
})
