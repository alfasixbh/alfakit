import type { RelationManagersBlock } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { panel, setPageProps } from './mocks'
import NotificationsChromeHarness from './NotificationsChromeHarness.svelte'
import RelationManagersHarness from './RelationManagersHarness.svelte'
import TenantMenuHarness from './TenantMenuHarness.svelte'

const user = { id: 1, name: 'Ada', email: 'ada@example.com' }

function renderChrome(overrides: Record<string, unknown>) {
  setPageProps({ alfakit: { ...panel, user, ...overrides } as typeof panel })

  return render(NotificationsChromeHarness, { props: { open: true } })
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

    const fields = [...container.querySelectorAll('[data-variant="sidebar"]')].filter((field) =>
      field.textContent?.includes('Search'),
    )
    expect(fields).toHaveLength(1)
    expect(fields[0]!.closest('[data-slot="topbar"]')).toBeNull()
    expect(container.querySelector('[data-slot="topbar"]')!.textContent).not.toContain('Search')
  })

  it('keeps the global search field in the top bar by default', () => {
    const { container } = renderChrome({ globalSearch: { keyBindings: [], placeholder: 'Search' } })

    expect(container.querySelector('[data-slot="topbar"] [data-variant="topbar"]')).not.toBeNull()
  })

  it('moves the user menu into the top bar', () => {
    const { container } = renderChrome({
      userMenu: { items: [], logoutUrl: '/logout', position: 'topbar' },
    })

    expect(container.querySelector('[data-slot="topbar"] button[aria-label="Ada"]')).not.toBeNull()
    expect(screen.queryByText('ada@example.com')).toBeNull()
  })

  it('keeps the user menu in the sidebar footer by default', () => {
    renderChrome({ userMenu: { items: [], logoutUrl: '/logout' } })

    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
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
    const { container } = render(TenantMenuHarness)

    expect(container.querySelector('[data-slot="tenant-menu-label"]')).toHaveTextContent(
      'Active team',
    )
    expect(screen.getByText('Acme')).toBeInTheDocument()
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

    render(RelationManagersHarness, { props: { block } })

    const tab = screen.getAllByRole('tab')[1]!
    await fireEvent.mouseDown(tab)
    await fireEvent.click(tab)

    expect(new URL(window.location.href).searchParams.get('relation')).toBe('tags')
  })
})
