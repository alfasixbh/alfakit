import type { TableSchema, TextEntrySchema } from '@alfakit/core'
import { beginTableLoading, endTableLoading, tableLoadingStore } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { router as reactRouter } from '@inertiajs/react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { ImageEntryComponent } from '../src/components/entries/other-entries'
import { TextEntryComponent } from '../src/components/entries/text-entry'
import { TableCellContent } from '../src/components/table/cells'
import { DataTable } from '../src/components/table/table-block'
import { Wrapper, setPageProps } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

const base: TableSchema = {
  type: 'Table',
  modelLabel: 'post',
  pluralModelLabel: 'posts',
  columns: [
    { type: 'TextColumn', name: 'title', label: 'Title', headerTooltip: 'The post title' },
    { type: 'TextColumn', name: 'status', label: 'Status', toggleable: true },
  ],
  visibleColumns: ['title', 'status'],
  toggleableColumns: true,
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [
    {
      key: 1,
      url: '/posts/1',
      cells: { title: { state: 'One', disabledClick: true }, status: { state: 'draft' } },
    },
  ],
  pagination: {
    currentPage: 2,
    lastPage: 5,
    perPage: 1,
    total: 5,
    from: 2,
    to: 2,
    pageOptions: [1],
  },
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  emptyState: { heading: 'No posts', icon: 'inbox' },
}

const visitedUrl = (): string => String(vi.mocked(router.visit).mock.calls.at(-1)?.[0] ?? '')

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView ??= () => {}
})

beforeEach(() => {
  vi.mocked(router.visit).mockClear()
  vi.mocked(reactRouter.visit).mockClear()
  tableLoadingStore.set({})
  setPageProps({ page: { class: 'X', layout: 'app', title: 'Posts', content: [], token: 't' } })
})

const renderTable = (table: Partial<TableSchema> = {}) =>
  render(
    <Wrapper>
      <DataTable table={{ ...base, ...table }} />
    </Wrapper>,
  )

describe('pagination and layout', () => {
  it('renders first and last page links with extremePaginationLinks()', () => {
    renderTable({ extremePaginationLinks: true })

    fireEvent.click(screen.getByRole('button', { name: 'Last page' }))
    expect(visitedUrl()).toContain('page=5')

    fireEvent.click(screen.getByRole('button', { name: 'First page' }))
    expect(visitedUrl()).not.toContain('page=')
  })

  it('has no extreme links by default', () => {
    renderTable()

    expect(screen.queryByRole('button', { name: 'First page' })).toBeNull()
  })

  it('shows a loading skeleton while the table reloads', () => {
    const { container } = renderTable({ loadingSkeleton: true })

    expect(container.querySelector('[data-slot="table-loading-skeleton"]')).toBeNull()

    act(() => beginTableLoading(undefined))
    expect(container.querySelector('[data-slot="table-loading-skeleton"]')).not.toBeNull()

    act(() => endTableLoading(undefined))
    expect(container.querySelector('[data-slot="table-loading-skeleton"]')).toBeNull()
  })

  it('uses the reorder trigger action for each state', () => {
    renderTable({
      reorderable: true,
      triggerActions: {
        reorderRecords: { label: 'Sort rows', variant: 'button' },
        reorderRecordsActive: { label: 'Stop sorting' },
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Sort rows' }))
    expect(screen.getByRole('button', { name: 'Stop sorting' })).toBeInTheDocument()
  })

  it('shows grouping settings inline on desktop unless kept in the dropdown', () => {
    const groups = { groups: [{ id: 'status', label: 'Status' }] }
    const { container, unmount } = renderTable(groups)

    const inline = container.querySelector('[data-slot="table-grouping-inline"]')
    expect(inline).not.toBeNull()
    fireEvent.change(within(inline as HTMLElement).getByRole('combobox'), {
      target: { value: 'status' },
    })
    expect(visitedUrl()).toContain('group=status')
    unmount()

    const dropdownOnly = renderTable({
      ...groups,
      groupingSettingsInDropdownOnDesktop: true,
      triggerActions: { groupRecords: { label: 'Group records', variant: 'button' } },
    })
    expect(dropdownOnly.container.querySelector('[data-slot="table-grouping-inline"]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Group records' })).toBeInTheDocument()
  })

  it('labels the default sort option of content layouts', () => {
    renderTable({
      columns: [{ type: 'TextColumn', name: 'title', label: 'Title', sortable: true }],
      visibleColumns: ['title'],
      contentLayout: [{ type: 'Column', name: 'title' }],
      defaultSortOptionLabel: 'Newest',
    })

    expect(screen.getByRole('option', { name: 'Newest' })).toBeInTheDocument()
  })
})

describe('columns', () => {
  it('renders header tooltips and swallows clicks on disabled cells', () => {
    renderTable()

    expect(screen.getByText(/The post title/, { selector: '.sr-only' })).toBeInTheDocument()

    fireEvent.click(screen.getByText('One'))
    expect(reactRouter.visit).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('draft'))
    expect(vi.mocked(reactRouter.visit).mock.calls[0]?.[0]).toBe('/posts/1')
  })

  it('defers column toggles until Apply and lays the manager out in a dialog', () => {
    renderTable({
      deferColumnManager: true,
      columnManagerLayout: 'modal',
      columnManagerColumns: { default: 2 },
      triggerActions: { columnManager: { label: 'Pick columns', variant: 'button' } },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Pick columns' }))
    const dialog = screen.getByRole('dialog')

    fireEvent.click(within(dialog).getByRole('checkbox'))
    expect(router.visit).not.toHaveBeenCalled()
    expect(within(dialog).getByRole('list')).toHaveClass('grid')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))
    expect(visitedUrl()).toContain('columns%5B0%5D=title')
    expect(visitedUrl()).not.toContain('status')
  })

  it('applies toggles at once and resets to the default columns', () => {
    renderTable({ visibleColumns: ['title'], columnManagerResetActionPosition: 'header' })

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(visitedUrl()).toContain('columns%5B1%5D=status')
  })
})

describe('filters', () => {
  const filtered: Partial<TableSchema> = {
    filters: [{ type: 'Filter', name: 'created', label: 'Created', schema: [] }],
    filterState: { created: { from: '2026-01-01', until: '2026-02-01' }, locked: { value: 1 } },
    filterIndicators: [
      { filter: 'created', label: 'From Jan', removeField: 'from' },
      { filter: 'locked', label: 'Locked', removable: false },
    ],
  }

  it('removes only the indicator field and keeps unremovable indicators', () => {
    renderTable(filtered)

    expect(screen.queryByRole('button', { name: 'Remove filter: Locked' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Remove filter: From Jan' }))
    expect(decodeURIComponent(visitedUrl())).toContain('filters[created][until]=2026-02-01')
    expect(decodeURIComponent(visitedUrl())).not.toContain('filters[created][from]=2026')

    fireEvent.click(screen.getByRole('button', { name: 'Remove all filters' }))
    expect(decodeURIComponent(visitedUrl())).toContain('filters[locked][value]=1')
    expect(decodeURIComponent(visitedUrl())).not.toContain('created')
  })

  it('customises the filters trigger, reset position and remove-all action', () => {
    renderTable({
      ...filtered,
      filtersResetActionPosition: 'header',
      triggerActions: {
        filters: { label: 'Filter', variant: 'button', badge: 'x' },
        filtersRemoveAll: { hidden: true },
        filtersReset: { label: 'Clear' },
      },
    })

    expect(screen.queryByRole('button', { name: 'Remove all filters' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Filter/ }))
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
  })
})

describe('cells and entries', () => {
  it('renders image ring, overlap and extra img attributes', () => {
    const { container } = render(
      <Wrapper>
        <TableCellContent
          column={{
            type: 'ImageColumn',
            name: 'a',
            label: 'A',
            stacked: true,
            ring: 4,
            overlap: 3,
          }}
          cell={{
            state: ['/1.png', '/2.png'],
            extraImgAttributes: { loading: 'lazy', class: 'x' },
          }}
          recordKey={1}
          token="t"
          component="table"
        />
      </Wrapper>,
    )
    const images = container.querySelectorAll('img')

    expect(images[0]).toHaveAttribute('loading', 'lazy')
    expect(images[0]).toHaveClass('x', 'object-cover')
    expect(images[0]).not.toHaveClass('ring-2')
    expect(images[1]?.style.marginInlineStart).toBe('-0.75rem')
    expect(images[0]?.style.boxShadow).toContain('4px')

    const entry = render(
      <Wrapper>
        <ImageEntryComponent
          component={{
            type: 'ImageEntry',
            key: 'img',
            state: ['/1.png'],
            extraImgAttributes: { 'data-test': 'img' },
          }}
        />
      </Wrapper>,
    )
    expect(entry.container.querySelector('img')).toHaveAttribute('data-test', 'img')
  })

  it('renders text input affix icons', () => {
    const { container } = render(
      <Wrapper>
        <TableCellContent
          column={{
            type: 'TextInputColumn',
            name: 'slug',
            label: 'Slug',
            editable: true,
            inputType: 'text',
            prefixIcon: 'link',
            suffixIcon: 'check',
            suffixIconColor: 'success',
          }}
          cell={{ state: 'a' }}
          recordKey={1}
          token="t"
          component="table"
        />
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="input-prefix-icon"]')).not.toBeNull()
    expect(container.querySelector('[data-slot="input-suffix-icon"]')).not.toBeNull()
    expect(container.querySelector('input')).toHaveClass('ps-8', 'pe-8')
  })

  it('expands limited lists', () => {
    const component: TextEntrySchema = {
      type: 'TextEntry',
      key: 'tags',
      state: ['a', 'b', 'c', 'd'],
      expandableLimitedList: true,
      listLimit: 2,
    }

    render(
      <Wrapper>
        <TextEntryComponent component={component} />
      </Wrapper>,
    )

    expect(screen.queryByText('c')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '+2 more' }))
    expect(screen.getByText('d')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }))
    expect(screen.queryByText('d')).toBeNull()
  })
})
