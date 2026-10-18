import type { TableSchema, TextEntrySchema } from '@alfakit/core'
import { beginTableLoading, endTableLoading, tableLoadingStore } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { router as svelteRouter } from '@inertiajs/svelte'
import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { tick } from 'svelte'
import ImageEntryComponent from '../src/components/entries/ImageEntryComponent.svelte'
import TextEntryComponent from '../src/components/entries/TextEntryComponent.svelte'
import DataTable from '../src/components/table/DataTable.svelte'
import TableCellContent from '../src/components/table/TableCellContent.svelte'
import { setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

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

beforeEach(() => {
  vi.mocked(router.visit).mockClear()
  vi.mocked(svelteRouter.visit).mockClear()
  tableLoadingStore.set({})
  setPageProps({ page: { class: 'X', layout: 'app', title: 'Posts', content: [], token: 't' } })
})

const renderTable = (table: Partial<TableSchema> = {}) =>
  render(Wrapper, { props: { component: DataTable, props: { table: { ...base, ...table } } } })

const renderCell = (props: Record<string, unknown>) =>
  render(Wrapper, {
    props: {
      component: TableCellContent,
      props: { recordKey: 1, token: 't', component: 'table', ...props },
    },
  })

describe('pagination and layout', () => {
  it('renders first and last page links with extremePaginationLinks()', async () => {
    renderTable({ extremePaginationLinks: true })

    await fireEvent.click(screen.getByRole('button', { name: 'Last page' }))
    expect(visitedUrl()).toContain('page=5')

    await fireEvent.click(screen.getByRole('button', { name: 'First page' }))
    expect(visitedUrl()).not.toContain('page=')
  })

  it('has no extreme links by default', () => {
    renderTable()

    expect(screen.queryByRole('button', { name: 'First page' })).toBeNull()
  })

  it('shows a loading skeleton while the table reloads', async () => {
    const { container } = renderTable({ loadingSkeleton: true })

    expect(container.querySelector('[data-slot="table-loading-skeleton"]')).toBeNull()

    beginTableLoading(undefined)
    await tick()
    expect(container.querySelector('[data-slot="table-loading-skeleton"]')).not.toBeNull()
    expect(container.querySelector('[data-surface="table"]')).toHaveAttribute('aria-busy', 'true')

    endTableLoading(undefined)
    await tick()
    expect(container.querySelector('[data-slot="table-loading-skeleton"]')).toBeNull()
  })

  it('uses the reorder trigger action for each state', async () => {
    renderTable({
      reorderable: true,
      triggerActions: {
        reorderRecords: { label: 'Sort rows', variant: 'button' },
        reorderRecordsActive: { label: 'Stop sorting' },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Sort rows' }))
    expect(screen.getByRole('button', { name: 'Stop sorting' })).toBeInTheDocument()
  })

  it('shows grouping settings inline on desktop unless kept in the dropdown', async () => {
    const groups = { groups: [{ id: 'status', label: 'Status' }] }
    const { container, unmount } = renderTable(groups)

    const inline = container.querySelector('[data-slot="table-grouping-inline"]')
    expect(inline).not.toBeNull()
    await fireEvent.change(within(inline as HTMLElement).getByRole('combobox'), {
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
  it('renders header tooltips and swallows clicks on disabled cells', async () => {
    const { container } = renderTable()

    expect(screen.getByText(/The post title/, { selector: '.sr-only' })).toBeInTheDocument()
    expect(container.querySelector('[data-slot="header-tooltip"]')).toHaveAttribute(
      'title',
      'The post title',
    )

    await fireEvent.click(screen.getByText('One'))
    expect(svelteRouter.visit).not.toHaveBeenCalled()
    expect(container.querySelector('[data-click-disabled]')).toHaveClass('cursor-default')

    await fireEvent.click(screen.getByText('draft'))
    expect(vi.mocked(svelteRouter.visit).mock.calls[0]?.[0]).toBe('/posts/1')
  })

  it('defers column toggles until Apply and lays the manager out in a dialog', async () => {
    renderTable({
      deferColumnManager: true,
      columnManagerLayout: 'modal',
      columnManagerColumns: { default: 2 },
      triggerActions: { columnManager: { label: 'Pick columns', variant: 'button' } },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Pick columns' }))
    const dialog = await screen.findByRole('dialog')

    await fireEvent.click(within(dialog).getByRole('checkbox'))
    expect(router.visit).not.toHaveBeenCalled()
    expect(within(dialog).getByRole('list')).toHaveClass('grid')

    await fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))
    expect(visitedUrl()).toContain('columns%5B0%5D=title')
    expect(visitedUrl()).not.toContain('status')
  })

  it('applies toggles at once and resets to the default columns', async () => {
    renderTable({ visibleColumns: ['title'], columnManagerResetActionPosition: 'header' })

    await fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    await fireEvent.click(await screen.findByRole('button', { name: 'Reset' }))
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

  it('removes only the indicator field and keeps unremovable indicators', async () => {
    renderTable(filtered)

    expect(screen.queryByRole('button', { name: 'Remove filter: Locked' })).toBeNull()

    await fireEvent.click(screen.getByRole('button', { name: 'Remove filter: From Jan' }))
    expect(decodeURIComponent(visitedUrl())).toContain('filters[created][until]=2026-02-01')
    expect(decodeURIComponent(visitedUrl())).not.toContain('filters[created][from]=2026')

    await fireEvent.click(screen.getByRole('button', { name: 'Remove all filters' }))
    expect(decodeURIComponent(visitedUrl())).toContain('filters[locked][value]=1')
    expect(decodeURIComponent(visitedUrl())).not.toContain('created')
  })

  it('customises the filters trigger, reset position and remove-all action', async () => {
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
    await fireEvent.click(screen.getByRole('button', { name: /Filter/ }))
    expect(await screen.findByRole('button', { name: 'Clear' })).toBeInTheDocument()
  })
})

describe('cells and entries', () => {
  it('renders image ring, overlap and extra img attributes', () => {
    const { container } = renderCell({
      column: {
        type: 'ImageColumn',
        name: 'a',
        label: 'A',
        stacked: true,
        ring: 4,
        overlap: 3,
      },
      cell: {
        state: ['/1.png', '/2.png'],
        extraImgAttributes: { loading: 'lazy', class: 'x' },
      },
    })
    const images = container.querySelectorAll('img')

    expect(images[0]).toHaveAttribute('loading', 'lazy')
    expect(images[0]).toHaveClass('x', 'object-cover')
    expect(images[0]).not.toHaveClass('ring-2')
    expect(images[1]?.style.marginInlineStart).toBe('-0.75rem')
    expect(images[0]?.style.boxShadow).toContain('4px')

    const entry = render(Wrapper, {
      props: {
        component: ImageEntryComponent,
        props: {
          component: {
            type: 'ImageEntry',
            key: 'img',
            state: ['/1.png'],
            extraImgAttributes: { 'data-test': 'img' },
          },
        },
      },
    })
    expect(entry.container.querySelector('img')).toHaveAttribute('data-test', 'img')
  })

  it('renders text input affix icons', () => {
    const { container } = renderCell({
      column: {
        type: 'TextInputColumn',
        name: 'slug',
        label: 'Slug',
        editable: true,
        inputType: 'text',
        prefixIcon: 'link',
        suffixIcon: 'check',
        suffixIconColor: 'success',
      },
      cell: { state: 'a' },
    })

    expect(container.querySelector('[data-slot="input-prefix-icon"]')).not.toBeNull()
    expect(container.querySelector('[data-slot="input-suffix-icon"]')).not.toBeNull()
    expect(container.querySelector('input')).toHaveClass('ps-8', 'pe-8')
  })

  it('expands limited lists', async () => {
    const component: TextEntrySchema = {
      type: 'TextEntry',
      key: 'tags',
      state: ['a', 'b', 'c', 'd'],
      expandableLimitedList: true,
      listLimit: 2,
    }

    render(Wrapper, { props: { component: TextEntryComponent, props: { component } } })

    expect(screen.queryByText('c')).toBeNull()
    await fireEvent.click(screen.getByRole('button', { name: '+2 more' }))
    expect(screen.getByText('d')).toBeInTheDocument()
    await fireEvent.click(screen.getByRole('button', { name: 'Show less' }))
    expect(screen.queryByText('d')).toBeNull()
  })
})
