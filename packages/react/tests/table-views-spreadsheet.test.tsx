import type { TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Spreadsheet } from '../src/components/table/spreadsheet'
import { DataTable } from '../src/components/table/table-block'
import { panel, setPageProps, Wrapper } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

const base: TableSchema = {
  type: 'Table',
  modelLabel: 'post',
  pluralModelLabel: 'posts',
  columns: [
    { type: 'TextInputColumn', name: 'title', label: 'Title', editable: true, inputType: 'text' },
    {
      type: 'SelectColumn',
      name: 'status',
      label: 'Status',
      editable: true,
      selectablePlaceholder: true,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
      ],
    },
    { type: 'ToggleColumn', name: 'featured', label: 'Featured', editable: true },
  ] as TableSchema['columns'],
  visibleColumns: ['title', 'status', 'featured'],
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [
    {
      key: 1,
      cells: { title: { state: 'One' }, status: { state: 'draft' }, featured: { state: false } },
    },
    {
      key: 2,
      cells: { title: { state: 'Two' }, status: { state: 'draft' }, featured: { state: true } },
    },
  ],
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  emptyState: { heading: 'No posts', icon: 'inbox' },
}

const views: TableSchema['views'] = {
  layout: 'tabs',
  queryKey: 'view',
  active: 'overdue',
  modified: true,
  canSave: true,
  canSetDefault: true,
  items: [
    { key: 'overdue', label: 'Overdue', type: 'preset' },
    { key: 'mine-1', label: 'Mine', type: 'personal', editable: true },
  ],
}

const visited = (): string[] => vi.mocked(router.visit).mock.calls.map(([url]) => String(url))

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.mocked(router.visit).mockClear()
  vi.mocked(router.reload).mockClear()
  setPageProps({
    alfakit: { ...panel, endpoints: { ...panel.endpoints, tableViews: '/tv', tableCells: '/tc' } },
  })
  window.history.replaceState(null, '', '/admin/posts?view=overdue&sort=title&page=2')
})

afterEach(() => {
  vi.unstubAllGlobals()
  setPageProps({ alfakit: panel })
})

describe('saved views', () => {
  it('shows the views as tabs and opens one without the table state it replaces', () => {
    render(
      <Wrapper>
        <DataTable table={{ ...base, views }} />
      </Wrapper>,
    )

    const tabs = within(screen.getByRole('tablist', { name: 'Views' })).getAllByRole('tab')

    expect(tabs.map((tab) => tab.textContent)).toEqual(['All', 'Overdue', 'Mine'])
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Modified')).toBeInTheDocument()

    fireEvent.click(tabs[2] as HTMLElement)
    fireEvent.click(tabs[0] as HTMLElement)

    expect(visited()).toEqual(['/admin/posts?view=mine-1', '/admin/posts?view='])
  })

  it('moves between view tabs with the arrow keys', () => {
    render(
      <Wrapper>
        <DataTable table={{ ...base, views }} />
      </Wrapper>,
    )

    const tabs = screen.getAllByRole('tab')

    ;(tabs[1] as HTMLElement).focus()
    fireEvent.keyDown(tabs[1] as HTMLElement, { key: 'ArrowRight' })

    expect(tabs[2]).toHaveFocus()
  })

  it('saves the current state as a new view and opens it', async () => {
    const fetch = vi.fn(async () => json({ view: 'new-abc' }))
    vi.stubGlobal('fetch', fetch)

    render(
      <Wrapper>
        <DataTable table={{ ...base, views }} />
      </Wrapper>,
    )

    fireEvent.pointerDown(screen.getByRole('button', { name: 'View options' }), {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse',
    })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Save as new view' }))

    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Next week' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(visited()).toEqual(['/admin/posts?view=new-abc']))

    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body)

    expect(body).toMatchObject({
      operation: 'create',
      name: 'Next week',
      component: 'table',
      tableQuery: '?view=overdue&sort=title&page=2',
    })
  })

  it('renders a dropdown layout', () => {
    render(
      <Wrapper>
        <DataTable table={{ ...base, views: { ...views, layout: 'dropdown', modified: false } }} />
      </Wrapper>,
    )

    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.getByRole('button', { name: /Overdue/ })).toBeInTheDocument()
  })
})

describe('spreadsheet mode', () => {
  const table: TableSchema = {
    ...base,
    spreadsheet: { columns: ['title', 'status', 'featured'], maxChanges: 1000 },
  }

  function renderGrid() {
    render(
      <Wrapper>
        <Spreadsheet table={table} token="tok" component="table" onClose={() => {}} />
      </Wrapper>,
    )

    return screen.getByRole('grid')
  }

  function cell(row: number, col: number): HTMLElement {
    return screen
      .getAllByRole('gridcell')
      .find(
        (element) =>
          element.getAttribute('aria-rowindex') === String(row + 2) &&
          element.getAttribute('aria-colindex') === String(col + 1),
      ) as HTMLElement
  }

  it('is a grid with positions and a roving focus', () => {
    const grid = renderGrid()

    expect(grid).toHaveAttribute('aria-rowcount', '3')
    expect(grid).toHaveAttribute('aria-colcount', '3')
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Title',
      'Status',
      'Featured',
    ])
    expect(cell(0, 0)).toHaveAttribute('tabindex', '0')
    expect(cell(0, 1)).toHaveAttribute('tabindex', '-1')
  })

  it('moves with the arrow keys and edits with Enter, marking the cell dirty', () => {
    const grid = renderGrid()

    act(() => cell(0, 0).focus())
    fireEvent.keyDown(grid, { key: 'ArrowDown' })

    expect(cell(1, 0)).toHaveAttribute('tabindex', '0')
    expect(cell(1, 0)).toHaveFocus()

    fireEvent.keyDown(grid, { key: 'Enter' })

    const input = within(cell(1, 0)).getByRole('textbox', { name: 'Title' })
    fireEvent.change(input, { target: { value: 'Changed' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(cell(1, 0)).toHaveTextContent('Changed')
    expect(cell(1, 0)).toHaveAttribute('data-dirty', 'true')
    expect(screen.getByText('1 unsaved change')).toBeInTheDocument()
  })

  it('fills down with Ctrl+D and copies the selection as TSV', () => {
    const grid = renderGrid()

    act(() => cell(0, 0).focus())
    fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })
    fireEvent.keyDown(grid, { key: 'd', ctrlKey: true })

    expect(cell(1, 0)).toHaveTextContent('One')
    expect(screen.getByText('1 cell filled')).toBeInTheDocument()

    const setData = vi.fn()
    fireEvent.copy(grid, { clipboardData: { setData } })

    expect(setData).toHaveBeenCalledWith('text/plain', 'One\nOne')
  })

  it('previews a TSV paste, validates it on the server and applies it', async () => {
    const fetch = vi.fn(async () =>
      json({ saved: [], errors: [{ record: 2, column: 'title', messages: ['Too long.'] }] }),
    )
    vi.stubGlobal('fetch', fetch)
    const grid = renderGrid()

    act(() => cell(0, 0).focus())
    fireEvent.paste(grid, {
      clipboardData: { getData: () => '"Quoted\ttitle"\tPublished\nVery long title\tnope' },
    })

    const dialog = await screen.findByRole('dialog', { name: 'Paste cells' })

    expect(within(dialog).getByText(/3 cells will change/)).toBeInTheDocument()
    expect(
      within(dialog).getByText('"nope" is not an option of Status (row 2)'),
    ).toBeInTheDocument()
    expect(await within(dialog).findByText('Row 2, Title: Too long.')).toBeInTheDocument()

    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body)

    expect(body).toMatchObject({
      dryRun: true,
      changes: [
        { record: 1, column: 'title', state: 'Quoted\ttitle' },
        { record: 1, column: 'status', state: 'published' },
        { record: 2, column: 'title', state: 'Very long title' },
      ],
    })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))

    expect(cell(0, 0).textContent).toBe('Quoted\ttitle')
    expect(cell(0, 1)).toHaveTextContent('Published')
    expect(cell(1, 0)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'Row 2, Title: Too long.' })).toBeInTheDocument()
  })

  it('saves the batch in one request and shows the cell errors', async () => {
    const fetch = vi.fn(async () =>
      json(
        {
          saved: [],
          errors: [{ record: 1, column: 'title', messages: ['The title field is required.'] }],
        },
        422,
      ),
    )
    vi.stubGlobal('fetch', fetch)
    const grid = renderGrid()

    act(() => cell(0, 0).focus())
    fireEvent.keyDown(grid, { key: 'Delete' })
    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    fireEvent.keyDown(grid, { key: ' ' })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(cell(0, 0)).toHaveAttribute('aria-invalid', 'true'))

    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(body.changes).toEqual([
      { record: 1, column: 'title', state: null },
      { record: 1, column: 'featured', state: true },
    ])
    expect(cell(0, 0)).toHaveAttribute('title', 'The title field is required.')
    expect(router.reload).not.toHaveBeenCalled()
  })

  it('mirrors the arrow keys right to left', () => {
    setPageProps({
      alfakit: {
        ...panel,
        localization: { ...(panel.localization ?? {}), direction: 'rtl' },
        endpoints: { ...panel.endpoints, tableCells: '/tc' },
      } as typeof panel,
    })
    const grid = renderGrid()

    act(() => cell(0, 0).focus())
    fireEvent.keyDown(grid, { key: 'ArrowLeft' })

    expect(cell(0, 1)).toHaveAttribute('tabindex', '0')
  })
})

describe('spreadsheet trigger', () => {
  it('is offered only for spreadsheet tables', async () => {
    const { rerender } = render(
      <Wrapper>
        <DataTable table={base} />
      </Wrapper>,
    )

    expect(screen.queryByRole('button', { name: /Edit as spreadsheet/ })).toBeNull()

    rerender(
      <Wrapper>
        <DataTable table={{ ...base, spreadsheet: { columns: ['title'], maxChanges: 1000 } }} />
      </Wrapper>,
    )

    const trigger = screen.getByRole('button', { name: /Edit as spreadsheet/ })

    fireEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByRole('grid')).toBeInTheDocument()
  })
})
