import type { TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { fireEvent, render, screen, within } from '@testing-library/svelte'
import DataTable from '../src/components/table/DataTable.svelte'
import TableCellContent from '../src/components/table/TableCellContent.svelte'
import TableFilters from '../src/components/table/TableFilters.svelte'
import { actions, setPageProps } from './mocks'
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

const renderTable = (table: TableSchema) =>
  render(Wrapper, { props: { component: DataTable, props: { table } } })

const renderCell = (props: Record<string, unknown>) =>
  render(Wrapper, {
    props: {
      component: TableCellContent,
      props: { token: 't', component: 'table', ...props },
    },
  })

beforeEach(() => {
  vi.mocked(router.visit).mockClear()
  setPageProps({ page: { class: 'X', layout: 'app', title: 'Posts', content: [], token: 't' } })
})

describe('stackedOnMobile', () => {
  it('renders cards with column labels below md', async () => {
    renderTable({ ...base, stackedOnMobile: true })

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
    await fireEvent.click(rowCheckboxes()[0]!)
    expect(rowCheckboxes()[0]).toHaveAttribute('data-state', 'checked')
  })

  it('leaves regular tables alone', () => {
    renderTable(base)

    expect(screen.getByRole('table')).not.toHaveAttribute('data-stacked-on-mobile')
  })
})

describe('selection safeguards', () => {
  it('stops selecting at maxSelectableRecords and hides "select all"', async () => {
    renderTable({ ...base, maxSelectableRecords: 2 })

    await fireEvent.click(rowCheckboxes()[0]!)
    await fireEvent.click(rowCheckboxes()[1]!)

    expect(rowCheckboxes()[2]).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Select all/ })).not.toBeInTheDocument()
    expect(screen.getByText('You can select up to 2 records')).toBeInTheDocument()
  })

  it('selects one group at a time under selectGroupsOnly', async () => {
    renderTable({
      ...base,
      selectGroupsOnly: true,
      grouping: { group: 'status', label: 'Status', direction: 'asc' } as never,
      recordGroups: [
        { key: 'a', title: 'Draft' },
        { key: 'b', title: 'Live' },
      ] as never,
    })

    expect(screen.queryByRole('checkbox', { name: 'Select page' })).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('checkbox', { name: 'Select group Draft' }))
    expect(rowCheckboxes()[0]).toHaveAttribute('data-state', 'checked')
    expect(rowCheckboxes()[1]).toHaveAttribute('data-state', 'checked')

    // A record of another group starts a new selection.
    await fireEvent.click(rowCheckboxes()[2]!)
    expect(rowCheckboxes()[0]).toHaveAttribute('data-state', 'unchecked')
    expect(rowCheckboxes()[2]).toHaveAttribute('data-state', 'checked')
  })

  it('sends the selection to record actions that accessSelectedRecords', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined as never)

    renderTable({
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
    })

    await fireEvent.click(rowCheckboxes()[1]!)
    await fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await vi.waitFor(() => expect(trigger).toHaveBeenCalled())
    expect(trigger.mock.calls[0]![1]).toMatchObject({
      record: 1,
      arguments: { alfakitSelectedRecords: ['2'] },
    })
    trigger.mockRestore()
  })
})

describe('filter layouts', () => {
  it('renders sidebar filters after the table', () => {
    const { container } = renderTable({ ...base, ...filters, filtersLayout: 'after-content' })

    const layout = container.querySelector('[data-slot="table-filters-layout"]')!
    const sidebar = container.querySelector('[data-slot="table-filters-sidebar"]')!

    expect(layout.lastElementChild).toBe(sidebar)
    expect(within(sidebar as HTMLElement).getByLabelText('Title contains')).toBeInTheDocument()
  })

  it('collapses sidebar filters when collapsible', async () => {
    render(Wrapper, {
      props: {
        component: TableFilters,
        props: {
          table: {
            ...base,
            ...filters,
            filtersLayout: 'before-content-collapsible',
            filtersFormWidth: 'sm',
          },
          component: 'table',
        },
      },
    })

    const sidebar = screen.getByRole('complementary', { name: 'Filters' })
    expect(sidebar.className).toContain('lg:w-sm')
    expect(screen.queryByLabelText('Title contains')).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    expect(screen.getByLabelText('Title contains')).toBeInTheDocument()
  })

  it('renders the filtersFormSchema layout', () => {
    render(Wrapper, {
      props: {
        component: TableFilters,
        props: {
          table: {
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
          },
          component: 'table',
        },
      },
    })

    expect(screen.getByText('Visibility')).toBeInTheDocument()
    expect(screen.getByLabelText('Title contains')).toBeInTheDocument()
  })

  it('hides filter indicators', () => {
    renderTable({
      ...base,
      ...filters,
      filterIndicators: [{ filter: 'title', label: 'Title: One' }],
      hiddenFilterIndicators: true,
    })

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

  it('searches its options, renders HTML labels and leaves the record out', async () => {
    renderCell({ column, cell: { state: '1' }, recordKey: 3 })

    const trigger = screen.getByRole('combobox', { name: 'Author' })
    expect(trigger.querySelector('b')?.textContent).toBe('Ada')

    await fireEvent.click(trigger)
    expect(await screen.findByRole('option', { name: 'Grace' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Alan' })).not.toBeInTheDocument()

    await fireEvent.input(screen.getByPlaceholderText('Type to search…'), {
      target: { value: 'ad' },
    })
    await vi.waitFor(() =>
      expect(screen.queryByRole('option', { name: 'Grace' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('option', { name: 'Ada' })).toBeInTheDocument()
  })

  it('searches remote options on the server and shows the current label', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ options: [{ value: '9', label: 'Margaret' }] }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderCell({
      column: { ...column, options: [], optionsSearchPath: '__columnOptions.author_id' },
      cell: { state: '7', optionLabel: 'Katherine' },
      recordKey: 1,
    })

    const trigger = screen.getByRole('combobox', { name: 'Author' })
    expect(trigger).toHaveTextContent('Katherine')

    await fireEvent.click(trigger)

    // jsdom can leave the popover `visibility: hidden` (floating-ui never measures a size),
    // which hides its text from the accessible name: match the option's text instead.
    await vi.waitFor(() =>
      expect(screen.getByRole('option', { hidden: true })).toHaveTextContent('Margaret'),
    )
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain('component=table.filters')
    vi.unstubAllGlobals()
  })
})

describe('image column alt text', () => {
  it('uses the alt text of the cell', () => {
    renderCell({
      column: { type: 'ImageColumn', name: 'avatar', label: 'Avatar' },
      cell: { state: ['/a.png'], alt: 'Ada Lovelace' },
      recordKey: 1,
    })

    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveAttribute('src', '/a.png')
  })
})
