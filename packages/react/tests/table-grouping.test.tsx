import type { TableSchema } from '@alfakit/core'
import { FormStore } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryBuilderRulesField } from '../src/components/fields/query-builder-rules'
import { FormProvider } from '../src/components/form/form-context'
import { TableFilters } from '../src/components/table/filters'
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
    { type: 'TextColumn', name: 'title', label: 'Title' },
    { type: 'TextColumn', name: 'rating', label: 'Rating', alignment: 'end' },
  ],
  visibleColumns: ['title', 'rating'],
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [
    { key: 1, group: 'draft', cells: { title: { state: 'Beta' }, rating: { state: 3 } } },
    { key: 2, group: 'draft', cells: { title: { state: 'Gamma' }, rating: { state: 1 } } },
    { key: 3, group: 'published', cells: { title: { state: 'Alpha' }, rating: { state: 5 } } },
  ],
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  emptyState: { heading: 'No posts', icon: 'inbox' },
}

const grouped: TableSchema = {
  ...base,
  groups: [
    { id: 'status', label: 'Status' },
    { id: 'author.name', label: 'Author' },
  ],
  grouping: { group: 'status', label: 'Status', direction: 'asc', collapsible: true },
  recordGroups: [
    { key: 'draft', title: 'Status: draft', summary: { rating: [{ label: 'Sum', value: '4' }] } },
    { key: 'published', title: 'Status: published', description: 'Live' },
  ],
  summaries: {
    page: { label: 'This page', values: { rating: [{ label: 'Sum', value: '9' }] } },
    all: { label: 'All posts', values: { rating: [{ label: 'Sum', value: '12' }] } },
  },
}

beforeEach(() => {
  vi.mocked(router.visit).mockClear()
  setPageProps({ page: { class: 'X', layout: 'app', title: 'Posts', content: [], token: 't' } })
})

describe('table summaries and grouping', () => {
  it('shows the enum icon in its colour before a group title', async () => {
    for (const collapsible of [true, false]) {
      const { container, unmount } = render(
        <Wrapper>
          <DataTable
            table={{
              ...grouped,
              grouping: { ...grouped.grouping!, collapsible },
              recordGroups: [
                { key: 'draft', title: 'Status: Draft copy', icon: 'pencil', color: 'gray' },
                { key: 'published', title: 'Status: Live', icon: 'circle-check', color: 'success' },
              ],
            }}
          />
        </Wrapper>,
      )

      const headings = container.querySelectorAll('[data-slot="table-group"]')
      expect(headings[1]).toHaveTextContent('Status: Live')
      await waitFor(() => {
        expect(headings[1]?.querySelector('.text-success')).not.toBeNull()
        expect(headings[0]?.querySelector('.text-muted-foreground.size-4')).not.toBeNull()
      })

      unmount()
    }
  })

  it('renders page and all-records summary rows', () => {
    const { container } = render(
      <Wrapper>
        <DataTable table={{ ...base, summaries: grouped.summaries }} />
      </Wrapper>,
    )

    const rows = container.querySelectorAll('tfoot [data-slot="table-summary"]')

    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('This page')
    expect(rows[0]).toHaveTextContent('9')
    expect(rows[1]).toHaveTextContent('All posts')
    expect(rows[1]).toHaveTextContent('12')
    expect(rows[1]?.querySelectorAll('td')[1]).toHaveClass('text-end')
  })

  it('renders group headings with group summaries and collapses groups', () => {
    const { container } = render(
      <Wrapper>
        <DataTable table={grouped} />
      </Wrapper>,
    )

    const headings = container.querySelectorAll('[data-slot="table-group"]')

    expect(headings).toHaveLength(2)
    expect(headings[1]).toHaveTextContent('Live')
    expect(container.querySelectorAll('tbody [data-slot="table-summary"]')).toHaveLength(1)

    const toggle = screen.getByRole('button', { name: 'Collapse group: Status: draft' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(toggle)

    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expand group: Status: draft' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('starts collapsed and shows only headings for groups-only tables', () => {
    const { container, rerender } = render(
      <Wrapper>
        <DataTable
          table={{ ...grouped, grouping: { ...grouped.grouping!, collapsedByDefault: true } }}
        />
      </Wrapper>,
    )

    expect(screen.queryByText('Beta')).not.toBeInTheDocument()

    rerender(
      <Wrapper>
        <DataTable
          table={{ ...grouped, records: [], grouping: { ...grouped.grouping!, groupsOnly: true } }}
        />
      </Wrapper>,
    )

    expect(screen.queryByText('No posts')).not.toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="table-group"]')).toHaveLength(2)
    // Groups-only headings are not collapsible.
    expect(screen.queryByRole('button', { name: /Collapse group/ })).not.toBeInTheDocument()
  })

  it('offers the group-by menu', () => {
    render(
      <Wrapper>
        <DataTable table={grouped} />
      </Wrapper>,
    )

    expect(screen.getByRole('button', { name: 'Group by' })).toBeInTheDocument()
  })
})

const filterTable: TableSchema = {
  ...base,
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

describe('deferred and modal filters', () => {
  it('waits for Apply before reloading deferred filters', async () => {
    vi.useFakeTimers()

    render(
      <Wrapper>
        <TableFilters
          table={{ ...filterTable, filtersLayout: 'above-content', deferFilters: true }}
          component="table"
        />
      </Wrapper>,
    )

    const apply = screen.getByRole('button', { name: 'Apply' })
    expect(apply).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Title contains'), { target: { value: 'Hel' } })
    vi.advanceTimersByTime(1000)

    expect(router.visit).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(router.visit).toHaveBeenCalledTimes(1)
    expect(String(vi.mocked(router.visit).mock.calls[0]![0])).toContain(
      'filters%5Btitle%5D%5Bvalue%5D=Hel',
    )
    vi.useRealTimers()
  })

  it('opens modal filters in a dialog and discards unapplied edits on cancel', async () => {
    render(
      <Wrapper>
        <TableFilters table={{ ...filterTable, filtersLayout: 'modal' }} component="table" />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Title contains'), { target: { value: 'Hel' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(router.visit).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    expect(within(await screen.findByRole('dialog')).getByLabelText('Title contains')).toHaveValue(
      '',
    )
  })
})

describe('query builder rules field', () => {
  const field = {
    type: 'QueryBuilderRules' as const,
    key: 'queryBuilder.query',
    name: 'query',
    statePath: 'queryBuilder.query',
    maxDepth: 1,
    constraints: [
      {
        name: 'title',
        label: 'Title',
        type: 'text' as const,
        operators: [
          { name: 'contains', label: 'contains', input: 'text' },
          { name: 'is_blank', label: 'is blank', input: 'none' },
        ],
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select' as const,
        multiple: true,
        options: [
          { value: 'draft', label: 'Draft' },
          { value: 'published', label: 'Published' },
        ],
        operators: [{ name: 'is', label: 'is', input: 'select' }],
      },
    ],
  }

  function renderField(state: Record<string, unknown> = {}) {
    const store = new FormStore(
      { components: [field as never], state, columns: { default: 1 } },
      { token: 't', component: 'table.filters' },
    )

    render(
      <Wrapper>
        <FormProvider store={store}>
          <QueryBuilderRulesField component={field as never} />
        </FormProvider>
      </Wrapper>,
    )

    return store
  }

  it('edits rules, values and combinators in the field state', () => {
    const store = renderField({
      queryBuilder: {
        query: {
          combinator: 'and',
          rules: [
            { type: 'constraint', constraint: 'title', operator: 'contains', value: 'a' },
            { type: 'constraint', constraint: 'status', operator: 'is', value: ['draft'] },
          ],
        },
      },
    })

    fireEvent.change(screen.getByDisplayValue('a'), { target: { value: 'news' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Published' }))
    fireEvent.click(screen.getByRole('button', { name: 'or' }))

    expect(store.state.values).toEqual({
      queryBuilder: {
        query: {
          combinator: 'or',
          rules: [
            { type: 'constraint', constraint: 'title', operator: 'contains', value: 'news' },
            {
              type: 'constraint',
              constraint: 'status',
              operator: 'is',
              value: ['draft', 'published'],
            },
          ],
        },
      },
    })

    // An operator without a value hides the input.
    fireEvent.change(screen.getAllByRole('combobox', { name: 'Operator' })[0]!, {
      target: { value: 'is_blank' },
    })
    expect(screen.queryByDisplayValue('news')).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove rule' })[1]!)
    expect(
      (store.state.values.queryBuilder as { query: { rules: unknown[] } }).query.rules,
    ).toHaveLength(1)
  })

  it('adds nested groups up to the depth limit', () => {
    const store = renderField()

    expect(screen.getByText('No rules yet.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add group' }))

    expect(store.state.values).toEqual({
      queryBuilder: {
        query: {
          combinator: 'and',
          rules: [
            {
              type: 'group',
              combinator: 'or',
              rules: [{ type: 'constraint', constraint: 'title', operator: 'contains' }],
            },
          ],
        },
      },
    })
    // maxDepth 1: the nested group cannot hold another group.
    expect(screen.getAllByRole('button', { name: 'Add group' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Remove group' })).toBeInTheDocument()
  })
})
