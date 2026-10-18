import type { RelationManagersBlock } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppSidebar } from '../src/components/panel/app-sidebar'
import { TenantMenu } from '../src/components/panel/tenant-menu'
import { Topbar } from '../src/components/panel/topbar'
import { SidebarProvider } from '../src/components/ui/sidebar'
import { ContentBlockRenderer } from '../src/pages/page'
import { Wrapper, panel, setPageProps } from './mocks'

const user = { id: 1, name: 'Ada', email: 'ada@example.com' }

function renderChrome(overrides: Record<string, unknown>) {
  setPageProps({ alfakit: { ...panel, user, ...overrides } as typeof panel })

  return render(
    <Wrapper>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <Topbar />
      </SidebarProvider>
    </Wrapper>,
  )
}

afterEach(() => {
  setPageProps({ alfakit: panel })
  window.history.replaceState(null, '', '/')
})

describe('panel chrome positions', () => {
  it('moves the global search field into the sidebar header', () => {
    const { container } = renderChrome({
      globalSearch: { keyBindings: [], placeholder: 'Search', position: 'sidebar' },
    })

    const field = container.querySelector('[data-variant="sidebar"]')
    expect(field).not.toBeNull()
    expect(field!.closest('[data-slot="topbar"]')).toBeNull()
    expect(field!.closest('[data-sidebar="header"], [data-slot="sidebar-header"]')).not.toBeNull()
    expect(screen.getAllByText('Search')).toHaveLength(1)
  })

  it('keeps the global search field in the top bar by default', () => {
    const { container } = renderChrome({ globalSearch: { keyBindings: [], placeholder: 'Search' } })

    const field = container.querySelector('[data-variant="topbar"]')
    expect(field!.closest('[data-slot="topbar"]')).not.toBeNull()
  })

  it('moves the user menu into the top bar', () => {
    const { container } = renderChrome({
      userMenu: { items: [], logoutUrl: '/logout', position: 'topbar' },
    })

    const trigger = screen.getByRole('button', { name: 'Ada' })
    expect(trigger.closest('[data-slot="topbar"]')).not.toBeNull()
    expect(container.querySelector('[data-slot="topbar"]')).not.toBeNull()
    expect(screen.queryByText('ada@example.com')).toBeNull()
  })

  it('keeps the user menu in the sidebar footer by default', () => {
    renderChrome({ userMenu: { items: [], logoutUrl: '/logout' } })

    expect(screen.queryByRole('button', { name: 'Ada' })).toBeNull()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
  })
})

describe('current tenant label', () => {
  const tenancy = (label?: string) => ({
    current: { id: 1, name: 'Acme', url: '/acme', label },
    tenants: [],
  })

  it('shows the label as a caption above the tenant name', () => {
    setPageProps({ alfakit: { ...panel, tenancy: tenancy('Active team') } })
    const { container } = render(
      <Wrapper>
        <SidebarProvider>
          <TenantMenu />
        </SidebarProvider>
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="tenant-menu-label"]')).toHaveTextContent(
      'Active team',
    )
    expect(screen.getByText('Acme')).toBeInTheDocument()
  })

  it('shows the brand without a label', () => {
    setPageProps({ alfakit: { ...panel, tenancy: tenancy() } })
    const { container } = render(
      <Wrapper>
        <SidebarProvider>
          <TenantMenu />
        </SidebarProvider>
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="tenant-menu-label"]')).toBeNull()
    expect(screen.getByText('Test')).toBeInTheDocument()
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

  it('writes the key from getRelations() to ?relation=', () => {
    const block: RelationManagersBlock = {
      type: 'RelationManagers',
      key: 'relationManagers',
      managers: [manager('rm:a', 'Comments', 'comments'), manager('rm:b', 'Tags', 'tags')],
    }

    render(
      <Wrapper>
        <ContentBlockRenderer block={block} />
      </Wrapper>,
    )

    fireEvent.mouseDown(screen.getAllByRole('tab')[1]!)

    expect(new URL(window.location.href).searchParams.get('relation')).toBe('tags')
  })

  it('writes the position for managers without keys', () => {
    const block: RelationManagersBlock = {
      type: 'RelationManagers',
      key: 'relationManagers',
      managers: [manager('rm:a', 'Comments'), manager('rm:b', 'Tags')],
    }

    render(
      <Wrapper>
        <ContentBlockRenderer block={block} />
      </Wrapper>,
    )

    fireEvent.mouseDown(screen.getAllByRole('tab')[1]!)

    expect(new URL(window.location.href).searchParams.get('relation')).toBe('1')
  })
})
