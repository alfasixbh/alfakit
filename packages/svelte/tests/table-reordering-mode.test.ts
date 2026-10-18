import type { TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import DataTable from '../src/components/table/DataTable.svelte'
import TableCellContent from '../src/components/table/TableCellContent.svelte'
import Wrapper from './Wrapper.svelte'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

const table: TableSchema = {
  type: 'Table',
  identifier: 'posts',
  modelLabel: 'post',
  pluralModelLabel: 'posts',
  columns: [{ type: 'TextColumn', name: 'title', label: 'Title' }],
  visibleColumns: ['title'],
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [
    { key: 1, cells: { title: { state: 'One' } } },
    { key: 2, cells: { title: { state: 'Two' } } },
  ],
  pagination: {
    currentPage: 2,
    lastPage: 3,
    perPage: 2,
    total: 6,
    from: 3,
    to: 4,
    pageOptions: [2],
  },
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  reorderable: true,
  emptyState: { heading: 'No posts', icon: 'inbox' },
}

const renderTable = (props: TableSchema) =>
  render(Wrapper, { props: { component: DataTable, props: { table: props } } })

const visitedUrls = (): string[] => vi.mocked(router.visit).mock.calls.map(([url]) => String(url))

beforeEach(() => {
  vi.mocked(router.visit).mockClear()
  vi.mocked(router.reload).mockClear()
  window.history.replaceState(null, '', '/admin/posts?posts_page=2')
})

describe('reorder mode', () => {
  it('reloads the table without pages when reordering starts', async () => {
    renderTable(table)

    await fireEvent.click(screen.getByRole('button', { name: /Reorder/ }))

    expect(visitedUrls()).toEqual(['/admin/posts?posts_reordering=1'])
    expect(screen.getByRole('button', { name: /Done/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps the pages with paginatedWhileReordering()', async () => {
    renderTable({ ...table, paginatedWhileReordering: true })

    await fireEvent.click(screen.getByRole('button', { name: /Reorder/ }))

    expect(router.visit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Done/ })).toBeInTheDocument()
  })

  it('starts in reorder mode on a reordering reload and leaves it with the pages back', async () => {
    window.history.replaceState(null, '', '/admin/posts?posts_reordering=1')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    )

    renderTable({ ...table, pagination: undefined, reordering: true })

    const rows = screen
      .getAllByRole('row')
      .filter((row) => row.getAttribute('draggable') === 'true')
    expect(rows).toHaveLength(2)

    await fireEvent.dragStart(rows[1]!)
    await fireEvent.drop(rows[0]!)
    await fireEvent.click(screen.getByRole('button', { name: /Done/ }))

    await waitFor(() => expect(visitedUrls()).toEqual(['/admin/posts']))
    expect(router.reload).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})

describe('select column messages', () => {
  const column = {
    type: 'SelectColumn',
    name: 'status',
    label: 'Status',
    editable: true,
    native: false,
    searchableOptions: true,
    selectablePlaceholder: false,
    options: [{ value: 'draft', label: 'Draft' }],
    searchPrompt: 'Find a status',
    noSearchResultsMessage: 'No status matches',
    noOptionsMessage: 'No statuses yet',
  } as const

  const renderCell = (extra: Record<string, unknown> = {}) =>
    render(Wrapper, {
      props: {
        component: TableCellContent,
        props: {
          token: 't',
          component: 'table',
          column: { ...column, ...extra },
          cell: { state: null },
          recordKey: 1,
        },
      },
    })

  it('shows the search prompt and the no-results message', async () => {
    renderCell()

    await fireEvent.click(screen.getByRole('combobox', { name: 'Status' }))
    await fireEvent.input(screen.getByPlaceholderText('Find a status'), {
      target: { value: 'zzz' },
    })

    expect(await screen.findByText('No status matches')).toBeInTheDocument()
  })

  it('shows the no-options message for an empty list', async () => {
    renderCell({ options: [] })

    await fireEvent.click(screen.getByRole('combobox', { name: 'Status' }))

    expect(await screen.findByText('No statuses yet')).toBeInTheDocument()
  })
})
