import type { PageSchema, PanelSchema, SlotItemSchema } from '@alfakit/core'
import { h } from 'vue'
import GlobalSearch from '../src/components/panel/GlobalSearch.vue'
import NavGroup from '../src/components/panel/NavGroup.vue'
import Slot from '../src/components/panel/Slot.vue'
import TenantMenu from '../src/components/panel/TenantMenu.vue'
import ThemeToggle from '../src/components/panel/ThemeToggle.vue'
import SidebarProvider from '../src/components/ui/SidebarProvider.vue'
import AppLayout from '../src/layouts/AppLayout.vue'
import AuthLayout from '../src/layouts/AuthLayout.vue'
import PageShell from '../src/pages/PageShell.vue'
import { flush, mountWithAlfakit, panel, setPageProps } from './mocks'

const html = (text: string, scopes?: string[]): SlotItemSchema => ({
  type: 'html',
  html: `<span>${text}</span>`,
  ...(scopes ? { for: scopes } : {}),
})

const withPanel = (overrides: Partial<PanelSchema>) =>
  setPageProps({ alfakit: { ...panel, ...overrides } })

const page = (overrides: Partial<PageSchema> = {}): PageSchema => ({
  class: 'App\\Settings',
  layout: 'app',
  title: 'Settings',
  content: [],
  token: 'tok',
  ...overrides,
})

async function openMenu(trigger: Element | null | undefined) {
  trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await flush()
  await flush()
}

afterEach(() => {
  setPageProps({ alfakit: panel })
  document.body.innerHTML = ''
})

describe('slots', () => {
  it('renders component-scoped content only in the matching component slot', () => {
    withPanel({
      slots: {
        'table.toolbar.start': [html('all'), html('comments', ['relationManager:App\\Comments'])],
      },
    })

    const plain = mountWithAlfakit(() => h(Slot, { name: 'table.toolbar.start', scope: 'table' }))
    expect(plain.text()).toBe('all')
    plain.unmount()

    const scoped = mountWithAlfakit(() =>
      h(Slot, { name: 'table.toolbar.start', scope: 'relationManager:App\\Comments' }),
    )
    expect(scoped.text()).toBe('allcomments')
    scoped.unmount()
  })

  it('places the layout, page and heading slots', () => {
    const names = [
      'layout.start',
      'content.before',
      'topbar.before',
      'page.start',
      'page.heading.before',
      'page.heading.after',
      'page.end',
    ]
    withPanel({ slots: Object.fromEntries(names.map((name) => [name, [html(name)]])) })

    const wrapper = mountWithAlfakit(() => h(PageShell, { page: page() }, () => h('p', 'Body')))

    for (const name of names) expect(wrapper.text()).toContain(name)
    wrapper.unmount()
  })

  it('puts the sign-in form slots inside the card', () => {
    withPanel({
      slots: { 'auth.login.form.before': [html('SSO')], 'simple.page.end': [html('Help')] },
    })

    const wrapper = mountWithAlfakit(() =>
      h(AuthLayout, { heading: 'Sign in' }, () => h('form', 'fields')),
    )

    expect(wrapper.find('[data-slot="card"]').text()).toContain('SSOfieldsHelp')
    wrapper.unmount()
  })
})

describe('panel chrome', () => {
  it('drops the top bar with topbar(false) but keeps a phone bar', () => {
    withPanel({ topbar: false })

    const wrapper = mountWithAlfakit(() => h(AppLayout, null, () => h('p', 'Body')))
    const bars = wrapper.findAll('[data-slot="topbar"]')

    expect(bars).toHaveLength(1)
    expect(bars[0]!.attributes('data-variant')).toBe('mobile')
    wrapper.unmount()
  })

  it('hides the theme switcher with themeSwitcher(false)', () => {
    withPanel({ darkMode: { enabled: true, forced: false, switcher: false } })

    const wrapper = mountWithAlfakit(() => h(ThemeToggle))
    expect(wrapper.find('button').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows a custom global search suffix and the global search slots', () => {
    withPanel({
      globalSearch: { keyBindings: ['mod+k'], placeholder: 'Search', suffix: 'Press /' },
      slots: { 'global-search.before': [html('before search')] },
    })

    const wrapper = mountWithAlfakit(() => h(GlobalSearch))
    expect(wrapper.text()).toContain('Press /')
    expect(wrapper.text()).toContain('before search')
    wrapper.unmount()
  })

  it('aligns header actions and sets body attributes while the page is open', () => {
    const wrapper = mountWithAlfakit(() =>
      h(
        PageShell,
        {
          page: page({
            headerActionsAlignment: 'center',
            extraBodyAttributes: { class: 'settings-page' },
          }),
        },
        () => h('p', 'Body'),
      ),
    )

    const header = wrapper.find('[data-slot="page-header"]')
    expect(header.attributes('data-actions-alignment')).toBe('center')
    expect(header.classes()).not.toContain('sm:flex-row')
    expect(document.body.classList.contains('settings-page')).toBe(true)

    wrapper.unmount()
    expect(document.body.classList.contains('settings-page')).toBe(false)
  })

  it('adds navigation group sidebar attributes, merging the class', () => {
    const wrapper = mountWithAlfakit(() =>
      h(SidebarProvider, null, () =>
        h(NavGroup, {
          group: {
            label: 'Shop',
            collapsible: false,
            items: [{ label: 'Orders', url: '/orders' }],
            extraSidebarAttributes: { class: 'shop-group', 'data-group': 'shop' },
          },
        }),
      ),
    )

    const group = wrapper.find('[data-group="shop"]')
    expect(group.classes()).toContain('shop-group')
    expect(group.attributes('data-sidebar')).toBe('group')
    wrapper.unmount()
  })
})

describe('tenant menu', () => {
  const tenancy = (overrides: Partial<NonNullable<PanelSchema['tenancy']>>) => ({
    current: { id: 1, name: 'Acme', url: '/acme' },
    tenants: [
      { id: 1, name: 'Acme', url: '/acme' },
      { id: 2, name: 'Globex', url: '/globex' },
    ],
    ...overrides,
  })

  it('filters tenants with the search field', async () => {
    withPanel({ tenancy: tenancy({ searchable: true }) })
    const wrapper = mountWithAlfakit(() => h(TenantMenu, { variant: 'topbar' }))
    await openMenu(document.body.querySelector('[data-slot="tenant-menu"]'))

    const input = document.body.querySelector<HTMLInputElement>('input[type="search"]')!
    input.value = 'glo'
    input.dispatchEvent(new Event('input'))
    await flush()

    const items = [...document.body.querySelectorAll('[role="menuitem"]')].map(
      (el) => el.textContent,
    )
    expect(items.join()).toContain('Globex')
    expect(items.join()).not.toContain('Acme')
    wrapper.unmount()
  })

  it('lists no tenants to switch to with tenantSwitcher(false)', async () => {
    withPanel({ tenancy: tenancy({ tenants: [], switcher: false, profileUrl: '/acme/settings' }) })
    const wrapper = mountWithAlfakit(() => h(TenantMenu, { variant: 'topbar' }))
    await openMenu(document.body.querySelector('[data-slot="tenant-menu"]'))

    expect(document.body.textContent).not.toContain('Switch')
    expect(document.body.textContent).toContain('Settings')
    wrapper.unmount()
  })

  it("labels the profile and registration links with the pages' own labels", async () => {
    withPanel({
      tenancy: tenancy({
        profileUrl: '/acme/settings',
        profileLabel: 'Team settings',
        registrationUrl: '/new',
        registrationLabel: 'Create team',
      }),
    })
    const wrapper = mountWithAlfakit(() => h(TenantMenu, { variant: 'topbar' }))
    await openMenu(document.body.querySelector('[data-slot="tenant-menu"]'))

    expect(document.body.textContent).toContain('Team settings')
    expect(document.body.textContent).toContain('Create team')
    wrapper.unmount()
  })
})
