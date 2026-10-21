import type { TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TableFilters } from '../src/components/table/filters'
import { DataTable } from '../src/components/table/table-block'
import { Wrapper, panel, setPageProps } from './mocks'

const table: TableSchema = {
  type: 'Table',
  modelLabel: 'post',
  pluralModelLabel: 'posts',
  columns: [
    { type: 'TextColumn', name: 'title', label: 'Title', sortable: true },
    { type: 'TextColumn', name: 'author.name', label: 'Author' },
    { type: 'IconColumn', name: 'is_published', label: 'Published' },
  ],
  visibleColumns: ['title', 'author.name', 'is_published'],
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [
    {
      key: 1,
      url: '/posts/1/edit',
      cells: {
        title: { state: 'Hello' },
        'author.name': { state: 'Ada' },
        is_published: { state: true, icon: 'circle-check', color: 'success' },
      },
      actions: [{ type: 'Action', name: 'edit', label: 'Edit', url: '/posts/1/edit' }],
    },
    {
      key: 2,
      cells: {
        title: { state: 'World' },
        'author.name': { state: null },
        is_published: { state: false, icon: 'circle-x', color: 'danger' },
      },
    },
  ],
  pagination: {
    currentPage: 1,
    lastPage: 3,
    perPage: 10,
    total: 25,
    from: 1,
    to: 10,
    pageOptions: [10, 25],
  },
  searchable: true,
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  selectable: true,
  bulkActions: [{ type: 'BulkAction', name: 'delete', label: 'Delete' }],
  emptyState: { heading: 'No posts', icon: 'inbox' },
}

describe('data table', () => {
  it('formats pagination numbers in the panel language (Persian digits)', () => {
    setPageProps({
      alfakit: { ...panel, localization: { code: 'fa', tag: 'fa', direction: 'rtl', locales: [] } },
      page: { class: 'X', layout: 'app', title: 'Posts', content: [], token: 't' },
    } as unknown as Parameters<typeof setPageProps>[0])

    render(
      <Wrapper>
        <DataTable table={table} />
      </Wrapper>,
    )

    expect(screen.getByText(/۱–۱۰ of ۲۵/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '۳' })).toBeInTheDocument()
    setPageProps({ alfakit: panel })
  })

  it('renders headers, cells, pagination and selection', () => {
    setPageProps({ page: { class: 'X', layout: 'app', title: 'Posts', content: [], token: 't' } })

    render(
      <Wrapper>
        <DataTable table={table} />
      </Wrapper>,
    )

    expect(screen.getByRole('button', { name: /Title/ })).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/posts/1/edit')
    expect(screen.getByText(/Showing 1–10 of 25/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument()
  })

  it('renders the empty state', () => {
    render(
      <Wrapper>
        <DataTable table={{ ...table, records: [], pagination: null }} />
      </Wrapper>,
    )

    expect(screen.getByText('No posts')).toBeInTheDocument()
  })

  it('requests deferred records once and renders them when they arrive', () => {
    const reload = vi.mocked(router.reload)
    reload.mockClear()
    const deferred = { ...table, deferLoading: true, records: undefined, pagination: undefined }

    const { rerender } = render(
      <Wrapper>
        <DataTable table={deferred} />
      </Wrapper>,
    )

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(reload).toHaveBeenCalledTimes(1)
    expect(reload).toHaveBeenCalledWith({ only: ['page'] })

    rerender(
      <Wrapper>
        <DataTable table={{ ...deferred }} />
      </Wrapper>,
    )
    expect(reload).toHaveBeenCalledTimes(1)

    rerender(
      <Wrapper>
        <DataTable table={table} />
      </Wrapper>,
    )
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('copies a cell without opening the row', async () => {
    const visit = vi.mocked(router.visit)
    visit.mockClear()
    const writeText = vi.fn(async () => undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(
      <Wrapper>
        <DataTable
          table={{
            ...table,
            columns: [{ type: 'TextColumn', name: 'title', label: 'Title', copyable: true }],
            visibleColumns: ['title'],
          }}
        />
      </Wrapper>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Copy' })[0]!)

    expect(writeText).toHaveBeenCalledWith('Hello')
    expect(visit).not.toHaveBeenCalled()
    expect(await screen.findByRole('status')).toHaveTextContent('Copied')
  })

  it('colours toggle columns and sizes icon columns', async () => {
    const { container } = render(
      <Wrapper>
        <DataTable
          table={{
            ...table,
            columns: [
              {
                type: 'ToggleColumn',
                name: 'active',
                label: 'Active',
                editable: true,
                onColor: 'warning',
                offColor: 'danger',
              },
              { type: 'IconColumn', name: 'is_published', label: 'Published' },
            ],
            visibleColumns: ['active', 'is_published'],
            records: [
              {
                key: 1,
                cells: {
                  active: { state: true },
                  is_published: { icon: 'circle-check', size: 'xl' },
                },
              },
            ],
          }}
        />
      </Wrapper>,
    )

    expect(screen.getByRole('switch')).toHaveClass('data-[state=checked]:bg-warning')
    expect(screen.getByRole('switch')).toHaveClass('data-[state=unchecked]:bg-destructive')
    await waitFor(() => expect(container.querySelector('svg.size-8')).not.toBeNull())
  })
})

it('leaves reorder mode when saving the new order fails', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ message: 'Nope' }), { status: 500 })),
  )

  render(
    <Wrapper>
      <DataTable table={{ ...table, reorderable: true, paginatedWhileReordering: true }} />
    </Wrapper>,
  )

  fireEvent.click(screen.getByRole('button', { name: /Reorder/ }))

  const rows = screen.getAllByRole('row').filter((row) => row.getAttribute('draggable') === 'true')
  fireEvent.dragStart(rows[1]!)
  fireEvent.drop(rows[0]!)
  fireEvent.click(screen.getByRole('button', { name: /Done/ }))

  expect(await screen.findByRole('button', { name: /Reorder/ })).toBeInTheDocument()
  vi.unstubAllGlobals()
})

describe('table filters', () => {
  const filtered: TableSchema = {
    ...table,
    filtersLayout: 'above-content',
    filters: [
      {
        type: 'Filter',
        name: 'title',
        label: 'Title',
        schema: [
          {
            type: 'TextInput',
            key: 'title.value',
            name: 'value',
            statePath: 'title.value',
            label: 'Title contains',
            inputType: 'text',
          } as never,
        ],
      },
    ],
    filterState: {},
  }

  it('keeps typed text when an unrelated reload re-renders the table', () => {
    const { rerender } = render(
      <Wrapper>
        <TableFilters table={filtered} component="table" />
      </Wrapper>,
    )

    fireEvent.change(screen.getByLabelText('Title contains'), { target: { value: 'Hel' } })

    // A poll or another reload delivers a fresh table object with the old filter state.
    rerender(
      <Wrapper>
        <TableFilters table={{ ...filtered, filterState: {} }} component="table" />
      </Wrapper>,
    )

    expect(screen.getByLabelText('Title contains')).toHaveValue('Hel')
  })

  it('drops a filter removed on the server', () => {
    const active = { ...filtered, filterState: { title: { value: 'Hel' } } }
    const { rerender } = render(
      <Wrapper>
        <TableFilters table={active} component="table" />
      </Wrapper>,
    )

    expect(screen.getByLabelText('Title contains')).toHaveValue('Hel')

    rerender(
      <Wrapper>
        <TableFilters table={{ ...active, filterState: {} }} component="table" />
      </Wrapper>,
    )

    expect(screen.getByLabelText('Title contains')).toHaveValue('')
  })

  it('collapses above-content filters when collapsible', () => {
    render(
      <Wrapper>
        <TableFilters
          table={{ ...filtered, filtersLayout: 'above-content-collapsible' }}
          component="table"
        />
      </Wrapper>,
    )

    const toggle = screen.getByRole('button', { name: /Filters/ })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Title contains')).not.toBeInTheDocument()

    fireEvent.click(toggle)

    expect(screen.getByLabelText('Title contains')).toBeInTheDocument()
  })
})

describe('selection scope', () => {
  const scoped = (scope: string, overrides: Partial<TableSchema> = {}) => (
    <Wrapper>
      <DataTable table={{ ...table, selectionScope: scope, ...overrides }} />
    </Wrapper>
  )

  it('clears the selection when the filters, search or tab change', () => {
    const { rerender } = render(scoped('a'))

    fireEvent.click(screen.getAllByRole('checkbox')[1]!)
    expect(screen.getAllByRole('checkbox')[1]).toHaveAttribute('data-state', 'checked')

    // A reload with the same scope (polling, an action) keeps it.
    rerender(scoped('a', { records: [...(table.records ?? [])] }))
    expect(screen.getAllByRole('checkbox')[1]).toHaveAttribute('data-state', 'checked')

    rerender(scoped('b'))
    expect(screen.getAllByRole('checkbox')[1]).toHaveAttribute('data-state', 'unchecked')
  })
})
