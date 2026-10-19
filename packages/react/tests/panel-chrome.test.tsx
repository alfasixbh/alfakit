import type { PageSchema, PanelSchema, RelationManagersBlock, SlotItemSchema } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppSidebar } from '../src/components/panel/app-sidebar'
import { GlobalSearch } from '../src/components/panel/global-search'
import { Slot } from '../src/components/panel/slot'
import { TenantMenu } from '../src/components/panel/tenant-menu'
import { ThemeToggle } from '../src/components/panel/theme-toggle'
import { SidebarProvider } from '../src/components/ui/sidebar'
import { AppLayout } from '../src/layouts/app-layout'
import { AuthLayout } from '../src/layouts/auth-layout'
import { ContentBlockRenderer, PageHeader, PageShell } from '../src/pages/page'
import { Wrapper, panel, setPageProps } from './mocks'

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

afterEach(() => setPageProps({ alfakit: panel, page: undefined }))

describe('slots', () => {
  it('renders component-scoped content only in the matching component slot', () => {
    withPanel({
      slots: {
        'table.toolbar.start': [html('all'), html('comments', ['relationManager:App\\Comments'])],
      },
    })

    const { container, rerender } = render(
      <Wrapper>
        <Slot name="table.toolbar.start" scope="table" />
      </Wrapper>,
    )
    expect(container).toHaveTextContent('all')
    expect(container).not.toHaveTextContent('comments')

    rerender(
      <Wrapper>
        <Slot name="table.toolbar.start" scope="relationManager:App\Comments" />
      </Wrapper>,
    )
    expect(container).toHaveTextContent('allcomments')
  })

  it('renders items with `when` only where the slot data matches', () => {
    withPanel({
      slots: {
        'table.header-cell': [
          html('every'),
          { ...html('title-only'), when: { column: 'title' } },
          { ...html('money'), when: { column: ['price', 'total'] } },
        ],
      },
    })

    const { container, rerender } = render(
      <Wrapper>
        <Slot name="table.header-cell" data={{ column: 'title' }} />
      </Wrapper>,
    )
    expect(container).toHaveTextContent('everytitle-only')
    expect(container).not.toHaveTextContent('money')

    rerender(
      <Wrapper>
        <Slot name="table.header-cell" data={{ column: 'total' }} />
      </Wrapper>,
    )
    expect(container).toHaveTextContent('everymoney')
    expect(container).not.toHaveTextContent('title-only')
  })

  it('places the layout, page, heading and widget slots', () => {
    withPanel({
      slots: Object.fromEntries(
        [
          'layout.start',
          'content.before',
          'topbar.before',
          'page.start',
          'page.heading.before',
          'page.heading.after',
          'page.end',
          'page.header-widgets.before',
          'resource.list-records.table.before',
        ].map((name) => [name, [html(name)]]),
      ),
    })

    render(
      <Wrapper>
        <PageShell page={page()}>
          <ContentBlockRenderer
            block={{ type: 'Widgets', key: 'headerWidgets', columns: { default: 1 }, widgets: [] }}
          />
        </PageShell>
      </Wrapper>,
    )

    for (const name of [
      'layout.start',
      'content.before',
      'topbar.before',
      'page.start',
      'page.heading.before',
      'page.heading.after',
      'page.end',
      'page.header-widgets.before',
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('places relation manager slots around each manager, scoped to it', () => {
    withPanel({
      slots: {
        'resource.relation-manager.before': [
          html('before comments', ['relationManager:App\\Comments']),
        ],
        'resource.tabs.start': [html('tabs start')],
      },
    })
    const manager = (key: string, title: string) => ({
      type: 'RelationManager' as const,
      key,
      component: key,
      title,
      lazy: true as const,
    })
    const block: RelationManagersBlock = {
      type: 'RelationManagers',
      key: 'relations',
      managers: [
        manager('relationManager:App\\Comments', 'Comments'),
        manager('relationManager:App\\Tags', 'Tags'),
      ],
    }

    render(
      <Wrapper>
        <ContentBlockRenderer block={block} />
      </Wrapper>,
    )

    expect(screen.getAllByText('before comments')).toHaveLength(1)
    expect(screen.getByText('tabs start')).toBeInTheDocument()
  })

  it('puts the sign-in form slots inside the card', () => {
    withPanel({
      slots: { 'auth.login.form.before': [html('SSO')], 'simple.page.end': [html('Help')] },
    })

    const { container } = render(
      <Wrapper>
        <AuthLayout heading="Sign in">
          <form>fields</form>
        </AuthLayout>
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="card"]')).toHaveTextContent('SSOfieldsHelp')
  })
})

describe('panel chrome', () => {
  it('drops the top bar with topbar(false) but keeps a phone bar with the sidebar toggle', () => {
    withPanel({ topbar: false })

    const { container } = render(
      <Wrapper>
        <AppLayout>
          <p>Body</p>
        </AppLayout>
      </Wrapper>,
    )

    const bars = container.querySelectorAll('[data-slot="topbar"]')
    expect(bars).toHaveLength(1)
    expect(bars[0]).toHaveAttribute('data-variant', 'mobile')
  })

  it('hides the theme switcher with themeSwitcher(false)', () => {
    withPanel({ darkMode: { enabled: true, forced: false, switcher: false } })

    const { container } = render(
      <Wrapper>
        <ThemeToggle />
      </Wrapper>,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('shows a custom global search suffix and the global search slots', () => {
    withPanel({
      globalSearch: { keyBindings: ['mod+k'], placeholder: 'Search', suffix: 'Press /' },
      slots: { 'global-search.before': [html('before search')] },
    })

    render(
      <Wrapper>
        <GlobalSearch />
      </Wrapper>,
    )

    expect(screen.getByText('Press /')).toBeInTheDocument()
    expect(screen.getByText('before search')).toBeInTheDocument()
  })

  it('aligns header actions and sets body attributes while the page is open', () => {
    const { container, unmount } = render(
      <Wrapper>
        <PageShell
          page={page({
            headerActionsAlignment: 'start',
            extraBodyAttributes: { class: 'settings-page' },
          })}
        >
          <p>Body</p>
        </PageShell>
      </Wrapper>,
    )

    const header = container.querySelector('[data-slot="page-header"]')!
    expect(header).toHaveAttribute('data-actions-alignment', 'start')
    expect(header.className).not.toContain('sm:flex-row')
    expect(document.body).toHaveClass('settings-page')

    unmount()
    expect(document.body).not.toHaveClass('settings-page')
  })

  it('renders PageHeader without alignment as a row', () => {
    const { container } = render(
      <Wrapper>
        <PageHeader page={page()} />
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="page-header"]')!.className).toContain('sm:flex-row')
  })

  it('adds navigation group sidebar attributes, merging the class', () => {
    withPanel({
      navigation: [
        {
          label: 'Shop',
          collapsible: false,
          items: [{ label: 'Orders', url: '/orders' }],
          extraSidebarAttributes: { class: 'shop-group', 'data-group': 'shop' },
        },
      ],
    })

    const { container } = render(
      <Wrapper>
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </Wrapper>,
    )

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

  const open = () => {
    fireEvent.pointerDown(screen.getByRole('button'), {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse',
    })
  }

  it('filters tenants with the search field', () => {
    withPanel({ tenancy: tenancy({ searchable: true }) })
    render(
      <Wrapper>
        <TenantMenu variant="topbar" />
      </Wrapper>,
    )
    open()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'glo' } })
    expect(screen.getByRole('menuitem', { name: /Globex/ })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Acme/ })).toBeNull()
  })

  it('lists no tenants to switch to with tenantSwitcher(false)', () => {
    withPanel({
      tenancy: tenancy({ tenants: [], switcher: false, profileUrl: '/acme/settings' }),
    })
    render(
      <Wrapper>
        <TenantMenu variant="topbar" />
      </Wrapper>,
    )
    open()

    expect(screen.queryByText('Switch')).toBeNull()
    expect(screen.getByRole('menuitem', { name: /Settings/ })).toBeInTheDocument()
  })

  it("labels the profile and registration links with the pages' own labels", () => {
    withPanel({
      tenancy: tenancy({
        profileUrl: '/acme/settings',
        profileLabel: 'Team settings',
        registrationUrl: '/new',
        registrationLabel: 'Create team',
      }),
    })
    render(
      <Wrapper>
        <TenantMenu variant="topbar" />
      </Wrapper>,
    )
    open()

    expect(screen.getByRole('menuitem', { name: /Team settings/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Create team/ })).toBeInTheDocument()
  })
})
