import type { RelationManagersBlock } from '@alfakit/core'
import { h } from 'vue'
import AppSidebar from '../src/components/panel/AppSidebar.vue'
import TenantMenu from '../src/components/panel/TenantMenu.vue'
import Topbar from '../src/components/panel/Topbar.vue'
import SidebarProvider from '../src/components/ui/SidebarProvider.vue'
import RelationManagers from '../src/pages/RelationManagers.vue'
import { flush, mountWithAlfakit, panel, setPageProps } from './mocks'

const user = { id: 1, name: 'Ada', email: 'ada@example.com' }

function mountChrome(overrides: Record<string, unknown>) {
  setPageProps({ alfakit: { ...panel, user, ...overrides } as typeof panel })

  return mountWithAlfakit(() =>
    h(SidebarProvider, { defaultOpen: true }, () => [h(AppSidebar), h(Topbar)]),
  )
}

afterEach(() => {
  setPageProps({ alfakit: panel })
  window.history.replaceState(null, '', '/')
})

describe('panel chrome positions', () => {
  it('moves the global search field into the sidebar header', () => {
    const wrapper = mountChrome({
      globalSearch: { keyBindings: [], placeholder: 'Search', position: 'sidebar' },
    })

    const fields = wrapper
      .findAll('[data-variant="sidebar"]')
      .filter((field) => field.text().includes('Search'))
    expect(fields).toHaveLength(1)
    expect(fields[0]!.element.closest('[data-slot="topbar"]')).toBeNull()
    expect(wrapper.find('[data-slot="topbar"]').text()).not.toContain('Search')
    wrapper.unmount()
  })

  it('keeps the global search field in the top bar by default', () => {
    const wrapper = mountChrome({ globalSearch: { keyBindings: [], placeholder: 'Search' } })

    expect(wrapper.find('[data-slot="topbar"] [data-variant="topbar"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('moves the user menu into the top bar', () => {
    const wrapper = mountChrome({
      userMenu: { items: [], logoutUrl: '/logout', position: 'topbar' },
    })

    expect(wrapper.find('[data-slot="topbar"] button[aria-label="Ada"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('ada@example.com')
    wrapper.unmount()
  })

  it('keeps the user menu in the sidebar footer by default', () => {
    const wrapper = mountChrome({ userMenu: { items: [], logoutUrl: '/logout' } })

    expect(wrapper.find('button[aria-label="Ada"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('ada@example.com')
    wrapper.unmount()
  })
})

describe('current tenant label', () => {
  it('shows the label as a caption above the tenant name', () => {
    setPageProps({
      alfakit: {
        ...panel,
        tenancy: {
          current: { id: 1, name: 'Acme', url: '/acme', label: 'Active team' },
          tenants: [],
        },
      },
    })
    const wrapper = mountWithAlfakit(() => h(SidebarProvider, null, () => h(TenantMenu)))

    expect(wrapper.find('[data-slot="tenant-menu-label"]').text()).toBe('Active team')
    expect(wrapper.text()).toContain('Acme')
    expect(wrapper.text()).not.toContain('Test')
    wrapper.unmount()
  })
})

describe('relation manager tabs in the query string', () => {
  const manager = (key: string, title: string, slug?: string) => ({
    type: 'RelationManager' as const,
    key,
    component: key,
    title,
    slug,
    lazy: true as const,
  })

  it('writes the key from getRelations() to ?relation=', async () => {
    const block: RelationManagersBlock = {
      type: 'RelationManagers',
      key: 'relationManagers',
      managers: [manager('rm:a', 'Comments', 'comments'), manager('rm:b', 'Tags', 'tags')],
    }
    const wrapper = mountWithAlfakit(() => h(RelationManagers, { block }))

    await wrapper.findAll('[role="tab"]')[1]!.trigger('mousedown', { button: 0 })
    await flush()

    expect(new URL(window.location.href).searchParams.get('relation')).toBe('tags')
    wrapper.unmount()
  })
})
