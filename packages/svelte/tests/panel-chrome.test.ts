import type { PageSchema, PanelSchema, SlotItemSchema } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/svelte'
import GlobalSearch from '../src/components/panel/GlobalSearch.svelte'
import TenantMenu from '../src/components/panel/TenantMenu.svelte'
import ThemeToggle from '../src/components/panel/ThemeToggle.svelte'
import ChromeHarness from './ChromeHarness.svelte'
import { panel, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

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

afterEach(() => setPageProps({ alfakit: panel }))

describe('slots', () => {
  it('renders component-scoped content only in the matching component slot', () => {
    withPanel({
      slots: {
        'table.toolbar.start': [html('all'), html('comments', ['relationManager:App\\Comments'])],
      },
    })

    const plain = render(ChromeHarness, { props: { kind: 'slot', name: 'table.toolbar.start' } })
    expect(plain.getByTestId('host')).toHaveTextContent(/^all$/)
    plain.unmount()

    render(ChromeHarness, {
      props: { kind: 'slot', name: 'table.toolbar.start', scope: 'relationManager:App\\Comments' },
    })
    expect(screen.getByTestId('host')).toHaveTextContent('allcomments')
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

    render(ChromeHarness, { props: { kind: 'page', page: page() } })

    for (const name of names) expect(screen.getByText(name)).toBeInTheDocument()
  })

  it('puts the sign-in form slots inside the card', () => {
    withPanel({
      slots: { 'auth.login.form.before': [html('SSO')], 'simple.page.end': [html('Help')] },
    })

    const { container } = render(ChromeHarness, { props: { kind: 'auth' } })

    expect(container.querySelector('[data-slot="card"]')).toHaveTextContent(/SSO\s*fields\s*Help/)
  })
})

describe('panel chrome', () => {
  it('drops the top bar with topbar(false) but keeps a phone bar', () => {
    withPanel({ topbar: false })

    const { container } = render(ChromeHarness, { props: { kind: 'app' } })
    const bars = container.querySelectorAll('[data-slot="topbar"]')

    expect(bars).toHaveLength(1)
    expect(bars[0]).toHaveAttribute('data-variant', 'mobile')
  })

  it('hides the theme switcher with themeSwitcher(false)', () => {
    withPanel({ darkMode: { enabled: true, forced: false, switcher: false } })

    const { container } = render(Wrapper, { props: { component: ThemeToggle } })
    expect(container.querySelector('button')).toBeNull()
  })

  it('shows a custom global search suffix and the global search slots', () => {
    withPanel({
      globalSearch: { keyBindings: ['mod+k'], placeholder: 'Search', suffix: 'Press /' },
      slots: { 'global-search.before': [html('before search')] },
    })

    render(Wrapper, { props: { component: GlobalSearch } })
    expect(screen.getByText('Press /')).toBeInTheDocument()
    expect(screen.getByText('before search')).toBeInTheDocument()
  })

  it('aligns header actions and sets body attributes while the page is open', () => {
    const { container, unmount } = render(ChromeHarness, {
      props: {
        kind: 'page',
        page: page({
          headerActionsAlignment: 'between',
          extraBodyAttributes: { class: 'settings-page' },
        }),
      },
    })

    const header = container.querySelector('[data-slot="page-header"]')!
    expect(header).toHaveAttribute('data-actions-alignment', 'between')
    expect(header.className).not.toContain('sm:flex-row')
    expect(document.body).toHaveClass('settings-page')

    unmount()
    expect(document.body).not.toHaveClass('settings-page')
  })

  it('adds navigation group sidebar attributes, merging the class', () => {
    const { container } = render(ChromeHarness, {
      props: {
        kind: 'nav-group',
        group: {
          label: 'Shop',
          collapsible: false,
          items: [{ label: 'Orders', url: '/orders' }],
          extraSidebarAttributes: { class: 'shop-group', 'data-group': 'shop' },
        },
      },
    })

    const group = container.querySelector('[data-group="shop"]')!
    expect(group.className).toContain('shop-group')
    expect(group.getAttribute('data-sidebar')).toBe('group')
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

  const open = (container: Element) => {
    const trigger = container.querySelector('[data-slot="tenant-menu"]')!
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' })
  }

  it('filters tenants with the search field', async () => {
    withPanel({ tenancy: tenancy({ searchable: true }) })
    const { container } = render(Wrapper, {
      props: { component: TenantMenu, props: { variant: 'topbar' } },
    })
    open(container)

    const input = await screen.findByRole('searchbox')
    await fireEvent.input(input, { target: { value: 'glo' } })

    expect(screen.getByRole('menuitem', { name: /Globex/ })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Acme/ })).toBeNull()
  })

  it('lists no tenants to switch to with tenantSwitcher(false)', async () => {
    withPanel({ tenancy: tenancy({ tenants: [], switcher: false, profileUrl: '/acme/settings' }) })
    const { container } = render(Wrapper, {
      props: { component: TenantMenu, props: { variant: 'topbar' } },
    })
    open(container)

    expect(await screen.findByText('Settings')).toBeInTheDocument()
    expect(screen.queryByText('Switch')).toBeNull()
  })
})
