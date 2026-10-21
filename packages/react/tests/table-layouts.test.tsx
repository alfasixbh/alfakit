import type { TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ViewEntryComponent } from '../src/components/entries/view-entry'
import { TablePagination } from '../src/components/table/pagination'
import { DataTable } from '../src/components/table/table-block'
import { Wrapper, panel, registry, setPageProps } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

const base: TableSchema = {
  type: 'Table',
  modelLabel: 'user',
  pluralModelLabel: 'users',
  columns: [
    { type: 'TextColumn', name: 'name', label: 'Name', sortable: true },
    { type: 'TextColumn', name: 'email', label: 'Email' },
    { type: 'TextColumn', name: 'phone', label: 'Phone' },
  ],
  visibleColumns: ['name', 'email', 'phone'],
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [
    {
      key: 1,
      url: '/users/1',
      cells: {
        name: { state: 'Ada' },
        email: { state: 'ada@example.com' },
        phone: { state: '123' },
      },
      actions: [{ type: 'Action', name: 'edit', label: 'Edit', url: '/users/1/edit' }],
    },
  ],
  pagination: null,
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  emptyState: { heading: 'No users', icon: 'inbox' },
}

beforeEach(() => {
  setPageProps({ page: { class: 'X', layout: 'app', title: 'Users', content: [], token: 't' } })
  vi.mocked(router.visit).mockClear()
})

describe('content layouts', () => {
  const layout: TableSchema = {
    ...base,
    contentLayout: [
      {
        type: 'Split',
        from: 'md',
        schema: [
          { type: 'Column', name: 'name' },
          { type: 'Stack', space: 2, schema: [{ type: 'Column', name: 'email' }] },
        ],
      },
      {
        type: 'Panel',
        collapsible: true,
        collapsed: true,
        schema: [{ type: 'Column', name: 'phone' }],
      },
    ],
  }

  it('renders records as layout blocks instead of a table', () => {
    const { container } = render(
      <Wrapper>
        <DataTable table={layout} />
      </Wrapper>,
    )

    expect(screen.queryByRole('table')).toBeNull()
    expect(container.querySelector('[data-layout="split"]')).toHaveClass('md:flex-row')
    expect(container.querySelector('[data-layout="stack"]')).toHaveClass('gap-2')
    expect(screen.getByRole('link', { name: 'Ada' })).toHaveAttribute('href', '/users/1')
    expect(screen.getByRole('link', { name: 'Edit' })).toBeInTheDocument()
  })

  it('collapses panels per record', () => {
    render(
      <Wrapper>
        <DataTable table={layout} />
      </Wrapper>,
    )

    expect(screen.queryByText('123')).toBeNull()

    const toggle = screen.getByRole('button', { name: 'Show details' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)

    expect(screen.getByText('123')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('lays cards out in a content grid and offers a sort select', () => {
    const { container } = render(
      <Wrapper>
        <DataTable table={{ ...layout, contentGrid: { md: 2, xl: 3 } }} />
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="table-content"]')).toHaveClass(
      'grid',
      'md:grid-cols-2',
      'xl:grid-cols-3',
    )

    fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), {
      target: { value: 'name' },
    })
    expect(router.visit).toHaveBeenCalledWith(
      expect.stringContaining('sort=name'),
      expect.anything(),
    )
  })
})

describe('column groups and record actions', () => {
  it('renders a group header spanning its columns', () => {
    render(
      <Wrapper>
        <DataTable
          table={{ ...base, columnGroups: [{ label: 'Contact', columns: ['email', 'phone'] }] }}
        />
      </Wrapper>,
    )

    const rows = within(screen.getByRole('table')).getAllByRole('row')
    const group = screen.getByRole('columnheader', { name: 'Contact' })

    expect(group).toHaveAttribute('colspan', '2')
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('rowspan', '2')
    expect(
      within(rows[1]!)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Email', 'Phone'])
  })

  it('puts actions before the selection checkbox for before-cells', () => {
    render(
      <Wrapper>
        <DataTable
          table={{
            ...base,
            recordActionsPosition: 'before-cells',
            selectable: true,
            bulkActions: [{ type: 'BulkAction', name: 'delete', label: 'Delete' }],
          }}
        />
      </Wrapper>,
    )

    const cells = within(screen.getAllByRole('row')[1]!).getAllByRole('cell')

    expect(within(cells[0]!).getByRole('link', { name: 'Edit' })).toBeInTheDocument()
    expect(within(cells[1]!).getByRole('checkbox')).toBeInTheDocument()
  })
})

describe('view columns and entries', () => {
  it('renders the registered component with the cell state and props', () => {
    registry.register('StatusBadge', ({ state, tone }: { state: unknown; tone: string }) => (
      <mark data-tone={tone}>{String(state)}</mark>
    ))

    render(
      <Wrapper>
        <DataTable
          table={{
            ...base,
            columns: [
              { type: 'ViewColumn', name: 'status', label: 'Status', component: 'StatusBadge' },
            ],
            visibleColumns: ['status'],
            records: [{ key: 1, cells: { status: { state: 'draft', props: { tone: 'muted' } } } }],
          }}
        />
      </Wrapper>,
    )

    expect(screen.getByText('draft')).toHaveAttribute('data-tone', 'muted')
  })

  it('says when a view component is missing', () => {
    render(
      <Wrapper>
        <ViewEntryComponent
          component={{ type: 'ViewEntry', key: 'e', name: 'e', component: 'Nope' }}
        />
      </Wrapper>,
    )

    expect(screen.getByText('Component Nope is not registered.')).toBeInTheDocument()
  })
})

describe('column breakpoints', () => {
  it('hides a column header and its cells outside its breakpoints', () => {
    render(
      <Wrapper>
        <DataTable
          table={{
            ...base,
            columns: [
              base.columns[0]!,
              { ...base.columns[1]!, visibleFrom: 'md' },
              { ...base.columns[2]!, hiddenFrom: 'lg' },
            ],
          }}
        />
      </Wrapper>,
    )

    const headers = screen.getAllByRole('columnheader')
    expect(headers[1]).toHaveClass('hidden', 'md:table-cell')
    expect(headers[2]).toHaveClass('lg:hidden')
    expect(headers[0]).not.toHaveClass('hidden')

    const cells = within(screen.getAllByRole('row')[1]!).getAllByRole('cell')
    expect(cells[1]).toHaveClass('hidden', 'md:table-cell')
    expect(cells[2]).toHaveClass('lg:hidden')
  })

  it('hides a layout block outside the column breakpoints', () => {
    render(
      <Wrapper>
        <DataTable
          table={{
            ...base,
            columns: [
              base.columns[0]!,
              { ...base.columns[1]!, visibleFrom: 'sm' },
              base.columns[2]!,
            ],
            contentLayout: [
              {
                type: 'Stack',
                schema: [
                  { type: 'Column', name: 'name' },
                  { type: 'Column', name: 'email' },
                ],
              },
            ],
          }}
        />
      </Wrapper>,
    )

    expect(document.querySelector('[data-column="email"]')).toHaveClass('hidden', 'sm:block')
    expect(document.querySelector('[data-column="name"]')).not.toHaveClass('hidden')
  })
})

describe('column manager', () => {
  it('reorders columns by drag and drop', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ columns: ['phone', 'name', 'email'] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetch)
    panel.endpoints.tableColumns = '/columns'

    render(
      <Wrapper>
        <DataTable table={{ ...base, reorderableColumns: true }} />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    const manager = await screen.findByRole('list', { name: 'Columns' })
    const items = within(manager).getAllByRole('listitem')
    expect(items[0]).toHaveAttribute('draggable', 'true')

    // Drop "Phone" onto "Name": it takes the first position.
    fireEvent.dragStart(items[2]!)
    fireEvent.dragOver(items[0]!)
    expect(items[0]).toHaveClass('bg-muted')
    fireEvent.drop(items[0]!)

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({ columns: ['phone', 'name', 'email'] })
    // The keyboard path stays available.
    expect(screen.getByRole('button', { name: 'Move Phone up' })).toBeInTheDocument()

    delete panel.endpoints.tableColumns
    vi.unstubAllGlobals()
  })

  it('moves a column and stores the order on the server', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ columns: ['email', 'name', 'phone'] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetch)
    panel.endpoints.tableColumns = '/columns'

    render(
      <Wrapper>
        <DataTable table={{ ...base, reorderableColumns: true }} />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Move Email up' }))

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/columns')
    expect(JSON.parse(String(init.body))).toMatchObject({
      token: 't',
      component: 'table',
      columns: ['email', 'name', 'phone'],
    })
    // The new order shows at once: Email is first now.
    expect(screen.getByRole('button', { name: 'Move Email up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Name up' })).toBeEnabled()

    delete panel.endpoints.tableColumns
    vi.unstubAllGlobals()
  })
})

describe('column manager reset', () => {
  it('resets the order before it restores the default visibility', async () => {
    let respond: (value: Response) => void = () => {}
    const fetch = vi.fn(() => new Promise<Response>((resolve) => (respond = resolve)))
    vi.stubGlobal('fetch', fetch)
    panel.endpoints.tableColumns = '/columns'
    vi.mocked(router.visit).mockClear()

    render(
      <Wrapper>
        <DataTable table={{ ...base, reorderableColumns: true, toggleableColumns: true }} />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Reset' }))

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    // The visibility visit waits for the order reset: running alongside it, its session
    // write would bring the old order back.
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(
      JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body)),
    ).toMatchObject({ columns: [] })
    expect(router.visit).not.toHaveBeenCalled()

    await act(async () => respond(new Response(JSON.stringify({ columns: [] }), { status: 200 })))
    await waitFor(() => expect(router.visit).toHaveBeenCalled())
    expect(decodeURIComponent(String(vi.mocked(router.visit).mock.calls.at(-1)![0]))).toContain(
      'columns[0]=name',
    )

    delete panel.endpoints.tableColumns
    vi.unstubAllGlobals()
  })
})

describe('pagination modes', () => {
  it('shows previous / next without a total for cursor pagination', () => {
    render(
      <Wrapper>
        <TablePagination
          table={{
            ...base,
            pagination: {
              mode: 'cursor',
              perPage: 10,
              from: 1,
              to: 10,
              pageOptions: [10],
              hasMorePages: true,
              nextCursor: 'abc',
              previousCursor: null,
            },
          }}
        />
      </Wrapper>,
    )

    expect(screen.getByText('Showing 1–10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(router.visit).toHaveBeenCalledWith(
      expect.stringContaining('cursor=abc'),
      expect.anything(),
    )
  })

  it('loads the next page with a load more button', () => {
    render(
      <Wrapper>
        <TablePagination
          table={{
            ...base,
            pagination: {
              mode: 'load-more',
              currentPage: 2,
              perPage: 10,
              from: 1,
              to: 20,
              pageOptions: [10],
              hasMorePages: true,
            },
          }}
        />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(router.visit).toHaveBeenCalledWith(expect.stringContaining('page=3'), expect.anything())
    expect(screen.getByRole('button', { name: 'Loading more…' })).toBeDisabled()
  })

  it('offers a retry when loading more fails instead of staying on "Loading more…"', () => {
    render(
      <Wrapper>
        <TablePagination
          table={{
            ...base,
            pagination: {
              mode: 'load-more',
              currentPage: 1,
              perPage: 10,
              from: 1,
              to: 10,
              pageOptions: [10],
              hasMorePages: true,
            },
          }}
        />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    const options = vi.mocked(router.visit).mock.calls.at(-1)![1] as {
      onFinish?: () => void
      onSuccess?: () => void
    }
    expect(options.onFinish).toBeTypeOf('function')

    // The visit ends without a success: no "Loading more…", a message and a retry button.
    act(() => options.onFinish!())
    expect(screen.queryByRole('button', { name: 'Loading more…' })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load more records.")

    vi.mocked(router.visit).mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(router.visit).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything())
    expect(screen.getByRole('button', { name: 'Loading more…' })).toBeDisabled()

    // A successful visit clears the failure.
    const retried = vi.mocked(router.visit).mock.calls.at(-1)![1] as typeof options
    act(() => {
      retried.onSuccess!()
      retried.onFinish!()
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('loads the next page when the infinite scroll sentinel is seen', () => {
    let callback: IntersectionObserverCallback = () => {}
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb
        }
        observe() {}
        disconnect() {}
      },
    )

    render(
      <Wrapper>
        <TablePagination
          table={{
            ...base,
            pagination: {
              mode: 'infinite',
              currentPage: 1,
              perPage: 10,
              from: 1,
              to: 10,
              pageOptions: [10],
              hasMorePages: true,
            },
          }}
        />
      </Wrapper>,
    )

    callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    expect(router.visit).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything())
    vi.unstubAllGlobals()
  })
})

describe('content layout sort select', () => {
  it('shows the placeholder while the table is sorted by a column it does not list', () => {
    render(
      <Wrapper>
        <DataTable
          table={{
            ...base,
            contentLayout: [{ type: 'Column', name: 'name' }],
            sort: { column: 'created_at', direction: 'desc' },
          }}
        />
      </Wrapper>,
    )

    const select = screen.getByRole('combobox', { name: 'Sort by' }) as HTMLSelectElement

    expect(select.value).toBe('')
    expect(select.selectedOptions[0]?.textContent).toBe('Sort by')
  })
})
