import type { PanelSchema, TableSchema } from '@alfakit/core'
import { resetTableTotals } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { flushPromises } from '@vue/test-utils'
import { h } from 'vue'
import AppSidebar from '../src/components/panel/AppSidebar.vue'
import DataTable from '../src/components/table/DataTable.vue'
import TablePagination from '../src/components/table/TablePagination.vue'
import SidebarProvider from '../src/components/ui/SidebarProvider.vue'
import { mountWithAlfakit, panel, setPageProps } from './mocks'

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

const mountSidebar = () =>
  mountWithAlfakit(() => h(SidebarProvider, { defaultOpen: true }, () => [h(AppSidebar)]), {
    attachTo: document.body,
  })

afterEach(() => {
  setPageProps({ alfakit: panel, page: undefined, alfakitNavigationBadges: undefined })
  resetTableTotals()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('split navigation', () => {
  it('marks the active item from navigationState and shows deferred badges once loaded', async () => {
    setPageProps({ alfakit: { ...panel, navigation, navigationState: { active: ['0.1'] } } })

    const first = mountSidebar()
    await flushPromises()
    const orders = () =>
      [...document.querySelectorAll('a')].find((link) => link.textContent?.includes('Orders'))

    expect(
      orders()?.closest('[data-active="true"]') ?? orders()?.getAttribute('data-active'),
    ).toBeTruthy()
    expect(document.querySelector('[data-slot="badge"][aria-busy="true"]')).not.toBeNull()
    first.unmount()
    document.body.innerHTML = ''

    setPageProps({
      alfakit: { ...panel, navigation, navigationState: { active: ['0.1'] } },
      alfakitNavigationBadges: { '0.1': { badge: 12 } },
    })
    mountSidebar()
    await flushPromises()

    expect(orders()?.textContent).toContain('12')
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
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
  it('shows a placeholder for the total and prefetches the next page on hover', async () => {
    const wrapper = mountWithAlfakit(() => h(TablePagination, { table: deferred }))
    await flushPromises()

    expect(wrapper.find('[data-slot="pagination-total"]').attributes('aria-busy')).toBe('true')

    await wrapper.find('button[aria-label="Next"]').trigger('pointerenter')

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

    const wrapper = mountWithAlfakit(() => h(DataTable, { table: deferred }))

    expect(wrapper.text()).toContain('Ada')
    await vi.waitFor(async () => {
      await flushPromises()
      expect(wrapper.find('[data-slot="pagination-total"]').exists()).toBe(false)
    })
    expect(fetchMock).toHaveBeenCalledWith('/totals', expect.objectContaining({ method: 'POST' }))
    expect(wrapper.text()).toContain('42')
    expect(wrapper.findAll('button').some((button) => button.text() === '5')).toBe(true)
  })
})
