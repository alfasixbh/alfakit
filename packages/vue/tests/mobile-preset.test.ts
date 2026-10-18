import type { NavigationGroupSchema, PanelSchema, TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { flushPromises } from '@vue/test-utils'
import { h } from 'vue'
import BottomNav from '../src/components/panel/BottomNav.vue'
import DataTable from '../src/components/table/DataTable.vue'
import { mountWithAlfakit, panel, setPageProps } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

const navigation: NavigationGroupSchema[] = [
  {
    collapsible: false,
    items: [
      { label: 'Dashboard', url: '/admin', icon: 'home', active: true },
      { label: 'Orders', url: '/admin/orders' },
      { label: 'Products', url: '/admin/products' },
      { label: 'Customers', url: '/admin/customers' },
      { label: 'Reports', url: '/admin/reports' },
    ],
  },
]

const theme = (mobile: 'drawer' | 'bottom'): PanelSchema['theme'] => ({
  ...panel.theme!,
  design: { ...panel.theme!.design, mobile },
})

const table: TableSchema = {
  type: 'Table',
  modelLabel: 'user',
  pluralModelLabel: 'users',
  columns: [
    { type: 'TextColumn', name: 'name', label: 'Name' },
    { type: 'TextColumn', name: 'email', label: 'Email' },
  ],
  visibleColumns: ['name', 'email'],
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [
    {
      key: 1,
      url: '/users/1',
      cells: { name: { state: 'Ada' }, email: { state: 'ada@example.com' } },
    },
  ],
  pagination: null,
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  emptyState: { heading: 'No users', icon: 'inbox' },
}

const originalWidth = window.innerWidth

function viewport(width: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
  window.matchMedia = ((query: string) => ({
    matches: width < 768,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

beforeEach(() => {
  setPageProps({
    alfakit: { ...panel, navigation, theme: theme('bottom') },
    page: { class: 'X', layout: 'app', title: 'Users', content: [], token: 't' },
  })
  vi.mocked(router.visit).mockClear()
})

afterEach(() => {
  viewport(originalWidth)
  setPageProps({ alfakit: panel })
  document.body.innerHTML = ''
})

describe('mobile preset', () => {
  it('renders the bottom bar with the first items and the rest behind "More"', async () => {
    const wrapper = mountWithAlfakit(() => h(BottomNav))

    const nav = wrapper.find('[data-slot="bottom-nav"]')
    expect(nav.attributes('aria-label')).toBe('Navigation')
    expect(nav.classes()).toContain('md:hidden')

    const items = nav.findAll('[data-slot="bottom-nav-item"]')
    expect(items.map((item) => item.text())).toEqual(['Dashboard', 'Orders', 'Products', 'More'])
    expect(items[0]!.attributes('data-active')).toBe('true')
    expect(items[0]!.attributes('aria-current')).toBe('page')
    expect(items[0]!.attributes('href')).toBe('/admin')
    expect(document.body.textContent).not.toContain('Reports')

    await wrapper.find('button[aria-haspopup="dialog"]').trigger('click')
    await flushPromises()

    const customers = document.body.querySelector('a[href="/admin/customers"]')
    expect(customers?.textContent).toContain('Customers')
    expect(document.body.textContent).toContain('Reports')
  })

  it('shows every item without "More" when they fit', () => {
    setPageProps({
      alfakit: {
        ...panel,
        theme: theme('bottom'),
        navigation: [{ ...navigation[0]!, items: navigation[0]!.items.slice(0, 3) }],
      },
    })

    const wrapper = mountWithAlfakit(() => h(BottomNav))

    expect(wrapper.findAll('[data-slot="bottom-nav-item"]')).toHaveLength(3)
    expect(wrapper.find('button[aria-haspopup="dialog"]').exists()).toBe(false)
  })

  it('renders tables as stacked cards on a phone', async () => {
    viewport(500)

    const wrapper = mountWithAlfakit(() => h(DataTable, { table }))
    await flushPromises()

    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.find('[data-slot="table-content"]').exists()).toBe(true)
    expect(wrapper.find('[data-layout="stack"]').classes()).toContain('gap-1')
    expect(wrapper.text()).toContain('ada@example.com')
  })

  it('keeps the table on desktop and without the preset', async () => {
    viewport(1280)
    const desktop = mountWithAlfakit(() => h(DataTable, { table }))
    await flushPromises()
    expect(desktop.find('table').exists()).toBe(true)

    viewport(500)
    setPageProps({ alfakit: { ...panel, navigation, theme: theme('drawer') } })
    const drawer = mountWithAlfakit(() => h(DataTable, { table }))
    await flushPromises()
    expect(drawer.find('table').exists()).toBe(true)
  })
})
