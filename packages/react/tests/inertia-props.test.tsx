import type { PanelSchema, TableSchema } from '@alfakit/core'
import { resetTableTotals } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppSidebar } from '../src/components/panel/app-sidebar'
import { TablePagination } from '../src/components/table/pagination'
import { DataTable } from '../src/components/table/table-block'
import { SidebarProvider } from '../src/components/ui/sidebar'
import { Wrapper, panel, setPageProps } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: {
    visit: vi.fn(),
    reload: vi.fn(),
    prefetch: vi.fn(),
    flushAll: vi.fn(),
    on: () => () => {},
  },
}))

// Split navigation: the structure (a once prop) and the request's state.
const navigation: PanelSchema['navigation'] = [
  {
    collapsible: false,
    items: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Orders', url: '/admin/orders', deferredBadge: true },
    ],
  },
]

const renderSidebar = () =>
  render(
    <Wrapper>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </Wrapper>,
  )

afterEach(() => {
  setPageProps({ alfakit: panel, page: undefined, alfakitNavigationBadges: undefined })
  resetTableTotals()
  vi.unstubAllGlobals()
})

describe('split navigation', () => {
  it('marks the active item from navigationState and shows deferred badges once loaded', () => {
    setPageProps({ alfakit: { ...panel, navigation, navigationState: { active: ['0.1'] } } })

    const { container, unmount } = renderSidebar()

    expect(screen.getByRole('link', { name: /Orders/ })).toHaveAttribute('data-active', 'true')
    expect(container.querySelector('[data-slot="badge"][aria-busy="true"]')).not.toBeNull()
    unmount()

    setPageProps({
      alfakit: { ...panel, navigation, navigationState: { active: ['0.1'] } },
      alfakitNavigationBadges: { '0.1': { badge: 12 } },
    })

    const second = renderSidebar()

    expect(screen.getByRole('link', { name: /Orders/ })).toHaveTextContent('12')
    expect(second.container.querySelector('[aria-busy="true"]')).toBeNull()
  })
})

const deferred: TableSchema = {
  type: 'Table',
  modelLabel: 'order',
  pluralModelLabel: 'orders',
  columns: [{ type: 'TextColumn', name: 'name', label: 'Name' }],
  visibleColumns: ['name'],
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [{ key: 1, cells: { name: { state: 'Ada' } } }],
  pagination: {
    mode: 'simple',
    currentPage: 1,
    perPage: 10,
    from: 1,
    to: 10,
    pageOptions: [10],
    simple: true,
    hasMorePages: true,
    pendingTotal: true,
  },
  deferredTotals: { key: 'abc' },
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  emptyState: { heading: 'No orders', icon: 'inbox' },
}

describe('deferred table totals', () => {
  it('shows a placeholder for the total and prefetches the next page on hover', () => {
    const { container } = render(
      <Wrapper>
        <TablePagination table={deferred} />
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="pagination-total"]')).toHaveAttribute(
      'aria-busy',
      'true',
    )

    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Next' }))

    expect(vi.mocked(router.prefetch)).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
      expect.objectContaining({ only: ['page'], preserveState: true }),
      { cacheFor: '10s' },
    )
  })

  it('loads the totals after the rows and turns them into numbered pagination', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ total: 42, lastPage: 5 }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    setPageProps({
      alfakit: { ...panel, endpoints: { ...panel.endpoints, tableTotals: '/totals' } },
      page: { class: 'X', layout: 'app', title: 'Orders', content: [], token: 't' },
    })

    const { container } = render(
      <Wrapper>
        <DataTable table={deferred} />
      </Wrapper>,
    )

    expect(screen.getByText('Ada')).toBeInTheDocument()
    await waitFor(() =>
      expect(container.querySelector('[data-slot="pagination-total"]')).toBeNull(),
    )
    expect(fetchMock).toHaveBeenCalledWith('/totals', expect.objectContaining({ method: 'POST' }))
    expect(container.textContent).toContain('42')
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument()
  })
})
