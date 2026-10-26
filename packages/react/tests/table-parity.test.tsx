import type { TableSchema } from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TableCellContent } from '../src/components/table/cells'
import { TableFilters } from '../src/components/table/filters'
import { DataTable } from '../src/components/table/table-block'
import { Wrapper, actions, setPageProps } from './mocks'

const base: TableSchema = {
  type: 'Table',
  modelLabel: 'post',
  pluralModelLabel: 'posts',
  columns: [
    { type: 'TextColumn', name: 'title', label: 'Title' },
    { type: 'TextColumn', name: 'status', label: 'Status' },
  ],
  visibleColumns: ['title', 'status'],
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [
    { key: 1, group: 'a', cells: { title: { state: 'One' }, status: { state: 'draft' } } },
    { key: 2, group: 'a', cells: { title: { state: 'Two' }, status: { state: 'draft' } } },
    { key: 3, group: 'b', cells: { title: { state: 'Three' }, status: { state: 'live' } } },
  ],
  pagination: {
    currentPage: 1,
    lastPage: 2,
    perPage: 3,
    total: 6,
    from: 1,
    to: 3,
    pageOptions: [3],
  },
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  selectable: true,
  bulkActions: [{ type: 'BulkAction', name: 'delete', label: 'Delete' }],
  emptyState: { heading: 'No posts', icon: 'inbox' },
}

const filters: Partial<TableSchema> = {
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

const rowCheckboxes = () => screen.getAllByRole('checkbox', { name: 'Select row' })

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView ??= () => {}
})

beforeEach(() => {
  setPageProps({ page: { class: 'X', layout: 'app', title: 'Posts', content: [], token: 't' } })
})

describe('stackedOnMobile', () => {
  it('renders cards with column labels below md', () => {
    render(
      <Wrapper>
        <DataTable table={{ ...base, stackedOnMobile: true }} />
      </Wrapper>,
    )

    const table = screen.getByRole('table')
    expect(table).toHaveAttribute('data-stacked-on-mobile', 'true')
    expect(table.className).toContain('max-md:block')

    const row = screen.getByText('One').closest('tr')!
    expect(row.className).toContain('max-md:flex-col')
    // Each cell repeats its column label, hidden from md up and from screen readers.
    const label = within(row).getByText('Title')
    expect(label.className).toContain('md:hidden')
    expect(label).toHaveAttribute('aria-hidden', 'true')
    // Selection keeps working.
    fireEvent.click(rowCheckboxes()[0]!)
    expect(rowCheckboxes()[0]).toHaveAttribute('data-state', 'checked')
  })

  it('leaves regular tables alone', () => {
    render(
      <Wrapper>
        <DataTable table={base} />
      </Wrapper>,
    )

    expect(screen.getByRole('table')).not.toHaveAttribute('data-stacked-on-mobile')
  })
})

describe('selection safeguards', () => {
  it('stops selecting at maxSelectableRecords and hides "select all"', () => {
    render(
      <Wrapper>
        <DataTable table={{ ...base, maxSelectableRecords: 2 }} />
      </Wrapper>,
    )

    fireEvent.click(rowCheckboxes()[0]!)
    fireEvent.click(rowCheckboxes()[1]!)

    expect(rowCheckboxes()[2]).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Select all/ })).not.toBeInTheDocument()
    expect(screen.getByText('You can select up to 2 records')).toBeInTheDocument()
  })

  it('selects one group at a time under selectGroupsOnly', () => {
    render(
      <Wrapper>
        <DataTable
          table={{
            ...base,
            selectGroupsOnly: true,
            grouping: { group: 'status', label: 'Status', direction: 'asc' } as never,
            recordGroups: [
              { key: 'a', title: 'Draft' },
              { key: 'b', title: 'Live' },
            ] as never,
          }}
        />
      </Wrapper>,
    )

    expect(screen.queryByRole('checkbox', { name: 'Select page' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select group Draft' }))
    expect(rowCheckboxes()[0]).toHaveAttribute('data-state', 'checked')
    expect(rowCheckboxes()[1]).toHaveAttribute('data-state', 'checked')

    // A record of another group starts a new selection.
    fireEvent.click(rowCheckboxes()[2]!)
    expect(rowCheckboxes()[0]).toHaveAttribute('data-state', 'unchecked')
    expect(rowCheckboxes()[2]).toHaveAttribute('data-state', 'checked')
  })

  it('sends the selection to record actions that accessSelectedRecords', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined as never)

    render(
      <Wrapper>
        <DataTable
          table={{
            ...base,
            records: [
              {
                ...base.records![0]!,
                actions: [
                  {
                    type: 'Action',
                    name: 'copy',
                    label: 'Copy',
                    hasAction: true,
                    accessSelectedRecords: true,
                  },
                ],
              },
              base.records![1]!,
            ],
          }}
        />
      </Wrapper>,
    )

    fireEvent.click(rowCheckboxes()[1]!)
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => expect(trigger).toHaveBeenCalled())
    expect(trigger.mock.calls[0]![1]).toMatchObject({
      record: 1,
      arguments: { alfakitSelectedRecords: ['2'] },
    })
    trigger.mockRestore()
  })
})

describe('filter layouts', () => {
  it('renders sidebar filters after the table', () => {
    const { container } = render(
      <Wrapper>
        <DataTable table={{ ...base, ...filters, filtersLayout: 'after-content' }} />
      </Wrapper>,
    )

    const layout = container.querySelector('[data-slot="table-filters-layout"]')!
    const sidebar = container.querySelector('[data-slot="table-filters-sidebar"]')!

    expect(layout.lastElementChild).toBe(sidebar)
    expect(within(sidebar as HTMLElement).getByLabelText('Title contains')).toBeInTheDocument()
  })

  it('collapses sidebar filters when collapsible', () => {
    render(
      <Wrapper>
        <TableFilters
          table={{
            ...base,
            ...filters,
            filtersLayout: 'before-content-collapsible',
            filtersFormWidth: 'sm',
          }}
          component="table"
        />
      </Wrapper>,
    )

    const sidebar = screen.getByRole('complementary', { name: 'Filters' })
    expect(sidebar.className).toContain('lg:w-sm')
    expect(screen.queryByLabelText('Title contains')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    expect(screen.getByLabelText('Title contains')).toBeInTheDocument()
  })

  it('renders the filtersFormSchema layout', () => {
    render(
      <Wrapper>
        <TableFilters
          table={{
            ...base,
            ...filters,
            filtersLayout: 'above-content',
            filtersFormSchema: [
              {
                type: 'Section',
                key: 'visibility',
                heading: 'Visibility',
                schema: [
                  { type: 'Group', key: 'filter:title', schema: filters.filters![0]!.schema },
                ],
              } as never,
            ],
          }}
          component="table"
        />
      </Wrapper>,
    )

    expect(screen.getByText('Visibility')).toBeInTheDocument()
    expect(screen.getByLabelText('Title contains')).toBeInTheDocument()
  })

  it('hides filter indicators', () => {
    render(
      <Wrapper>
        <DataTable
          table={{
            ...base,
            ...filters,
            filterIndicators: [{ filter: 'title', label: 'Title: One' }],
            hiddenFilterIndicators: true,
          }}
        />
      </Wrapper>,
    )

    expect(screen.queryByText('Title: One')).not.toBeInTheDocument()
  })
})

describe('select column combobox', () => {
  const column = {
    type: 'SelectColumn',
    name: 'author_id',
    label: 'Author',
    editable: true,
    native: false,
    searchableOptions: true,
    allowOptionsHtml: true,
    selectablePlaceholder: false,
    options: [
      { value: '1', label: '<b>Ada</b>' },
      { value: '2', label: 'Grace' },
      { value: '3', label: 'Alan' },
    ],
    ignoreRecord: true,
    optionsLimit: 5,
  } as const

  it('searches its options, renders HTML labels and leaves the record out', () => {
    render(
      <Wrapper>
        <TableCellContent
          column={column as never}
          cell={{ state: '1' }}
          recordKey={3}
          token="t"
          component="table"
        />
      </Wrapper>,
    )

    const trigger = screen.getByRole('combobox', { name: 'Author' })
    expect(trigger.querySelector('b')?.textContent).toBe('Ada')

    fireEvent.click(trigger)
    expect(screen.queryByRole('option', { name: 'Alan' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Grace' })).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Type to search…'), { target: { value: 'ad' } })
    expect(screen.getByRole('option', { name: 'Ada' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Grace' })).not.toBeInTheDocument()
  })

  it('searches remote options on the server and shows the current label', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ options: [{ value: '9', label: 'Margaret' }] }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(
      <Wrapper>
        <TableCellContent
          column={
            { ...column, options: [], optionsSearchPath: '__columnOptions.author_id' } as never
          }
          cell={{ state: '7', optionLabel: 'Katherine' }}
          recordKey={1}
          token="t"
          component="table"
        />
      </Wrapper>,
    )

    const trigger = screen.getByRole('combobox', { name: 'Author' })
    expect(trigger).toHaveTextContent('Katherine')

    fireEvent.click(trigger)

    expect(await screen.findByRole('option', { name: 'Margaret' })).toBeInTheDocument()
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain('component=table.filters')
    vi.unstubAllGlobals()
  })
})

describe('image column alt text', () => {
  it('uses the alt text of the cell', () => {
    render(
      <Wrapper>
        <TableCellContent
          column={{ type: 'ImageColumn', name: 'avatar', label: 'Avatar' }}
          cell={{ state: ['/a.png'], alt: 'Ada Lovelace' }}
          recordKey={1}
          token="t"
          component="table"
        />
      </Wrapper>,
    )

    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveAttribute('src', '/a.png')
  })
  it('names an image without alt() after its column, so a record link around it has a name (W-V4-20)', () => {
    const { container } = render(
      <Wrapper>
        <a href="/posts/4/edit">
          <TableCellContent
            column={{ type: 'ImageColumn', name: 'cover', label: 'Cover' }}
            cell={{ state: ['/a.png', '/b.png'] }}
            recordKey={1}
            token="t"
            component="table"
          />
        </a>
      </Wrapper>,
    )

    expect(screen.getByRole('link', { name: 'Cover' })).toBeInTheDocument()
    // Further images of a stack stay decorative.
    expect(container.querySelectorAll('img')[1]).toHaveAttribute('alt', '')
  })
})
