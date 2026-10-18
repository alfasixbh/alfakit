import type { NavigationGroupSchema, PanelSchema, TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { BottomNav } from '../src/components/panel/bottom-nav'
import { DataTable } from '../src/components/table/table-block'
import { Wrapper, panel, setPageProps } from './mocks'

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
  name: 'alfakit',
  attribute: 'alfakit',
  sidebar: 'inset',
  density: 'comfortable',
  design: {
    layout: 'sidebar',
    nav: 'soft',
    header: 'plain',
    surfaces: 'bordered',
    inputs: 'outline',
    buttons: 'rounded',
    tables: 'lined',
    mobile,
  },
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
})

describe('mobile preset', () => {
  it('renders the bottom bar with the first items and the rest behind "More"', () => {
    const { container } = render(
      <Wrapper>
        <BottomNav />
      </Wrapper>,
    )

    const nav = container.querySelector('[data-slot="bottom-nav"]')!
    expect(nav).toHaveAttribute('aria-label', 'Navigation')
    expect(nav).toHaveClass('md:hidden')

    const items = [...nav.querySelectorAll('[data-slot="bottom-nav-item"]')]
    expect(items.map((item) => item.textContent)).toEqual([
      'Dashboard',
      'Orders',
      'Products',
      'More',
    ])
    expect(items[0]).toHaveAttribute('data-active', 'true')
    expect(items[0]).toHaveAttribute('aria-current', 'page')
    expect(items[0]).toHaveAttribute('href', '/admin')
    expect(screen.queryByText('Reports')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'More' }))

    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute(
      'href',
      '/admin/customers',
    )
    expect(screen.getByRole('link', { name: 'Reports' })).toBeInTheDocument()
  })

  it('shows every item without "More" when they fit', () => {
    setPageProps({
      alfakit: {
        ...panel,
        theme: theme('bottom'),
        navigation: [{ ...navigation[0]!, items: navigation[0]!.items.slice(0, 3) }],
      },
    })

    const { container } = render(
      <Wrapper>
        <BottomNav />
      </Wrapper>,
    )

    expect(container.querySelectorAll('[data-slot="bottom-nav-item"]')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull()
  })

  it('renders tables as stacked cards on a phone', () => {
    viewport(500)

    const { container } = render(
      <Wrapper>
        <DataTable table={table} />
      </Wrapper>,
    )

    expect(screen.queryByRole('table')).toBeNull()
    expect(container.querySelector('[data-slot="table-content"]')).not.toBeNull()
    expect(container.querySelector('[data-layout="stack"]')).toHaveClass('gap-1')
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
  })

  it('keeps the table on desktop and without the preset', () => {
    viewport(1280)
    const desktop = render(
      <Wrapper>
        <DataTable table={table} />
      </Wrapper>,
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
    desktop.unmount()

    viewport(500)
    setPageProps({ alfakit: { ...panel, navigation, theme: theme('drawer') } })
    render(
      <Wrapper>
        <DataTable table={table} />
      </Wrapper>,
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
