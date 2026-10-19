import { FormStore, type TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { tick } from 'svelte'
import DataTable from '../src/components/table/DataTable.svelte'
import TableFilters from '../src/components/table/TableFilters.svelte'
import FormHarness from './FormHarness.svelte'
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
  groups: [{ id: 'status', label: 'Status' }],
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
      const { container, unmount } = render(Wrapper, {
        props: {
          component: DataTable,
          props: {
            table: {
              ...grouped,
              grouping: { ...grouped.grouping!, collapsible },
              recordGroups: [
                { key: 'draft', title: 'Status: Draft copy', icon: 'pencil', color: 'gray' },
                { key: 'published', title: 'Status: Live', icon: 'circle-check', color: 'success' },
              ],
            },
          },
        },
      })

      const headings = container.querySelectorAll('[data-slot="table-group"]')
      expect(headings[1]).toHaveTextContent('Status: Live')
      await waitFor(() => {
        expect(headings[1]?.querySelector('.text-success')).not.toBeNull()
        expect(headings[0]?.querySelector('.text-muted-foreground.size-4')).not.toBeNull()
      })

      unmount()
    }
  })

  it('renders summary rows, group headings and collapses groups', async () => {
    const { container } = render(Wrapper, {
      props: { component: DataTable, props: { table: grouped } },
    })

    const footer = container.querySelectorAll('tfoot [data-slot="table-summary"]')
    expect(footer).toHaveLength(2)
    expect(footer[0]).toHaveTextContent('This page')
    expect(footer[1]).toHaveTextContent('12')
    expect(footer[1]?.querySelectorAll('td')[1]).toHaveClass('text-end')
    expect(container.querySelectorAll('[data-slot="table-group"]')).toHaveLength(2)
    expect(container.querySelectorAll('tbody [data-slot="table-summary"]')).toHaveLength(1)
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Group by' })).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Collapse group: Status: draft' }))

    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expand group: Status: draft' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('shows only headings for groups-only tables', () => {
    const { container } = render(Wrapper, {
      props: {
        component: DataTable,
        props: {
          table: { ...grouped, records: [], grouping: { ...grouped.grouping!, groupsOnly: true } },
        },
      },
    })

    expect(screen.queryByText('No posts')).not.toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="table-group"]')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /Collapse group/ })).not.toBeInTheDocument()
  })
})

describe('deferred filters', () => {
  it('waits for Apply before reloading', async () => {
    vi.useFakeTimers()

    render(Wrapper, {
      props: {
        component: TableFilters,
        props: {
          component: 'table',
          table: {
            ...base,
            filtersLayout: 'above-content',
            deferFilters: true,
            filterState: {},
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
                  },
                ],
              },
            ],
          },
        },
      },
    })

    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled()

    await fireEvent.input(screen.getByLabelText('Title contains'), { target: { value: 'Hel' } })
    vi.advanceTimersByTime(1000)
    await tick()
    expect(router.visit).not.toHaveBeenCalled()

    await fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(router.visit).toHaveBeenCalledTimes(1)
    expect(String(vi.mocked(router.visit).mock.calls[0]![0])).toContain(
      'filters%5Btitle%5D%5Bvalue%5D=Hel',
    )

    vi.useRealTimers()
  })
})

describe('query builder rules field', () => {
  it('edits values and combinators and adds nested groups', async () => {
    const field = {
      type: 'QueryBuilderRules',
      key: 'queryBuilder.query',
      name: 'query',
      statePath: 'queryBuilder.query',
      maxDepth: 1,
      constraints: [
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          operators: [
            { name: 'contains', label: 'contains', input: 'text' },
            { name: 'is_blank', label: 'is blank', input: 'none' },
          ],
        },
      ],
    }
    const store = new FormStore(
      {
        components: [field as never],
        state: {
          queryBuilder: {
            query: {
              combinator: 'and',
              rules: [
                { type: 'constraint', constraint: 'title', operator: 'contains', value: 'a' },
                { type: 'constraint', constraint: 'title', operator: 'is_blank' },
              ],
            },
          },
        },
      },
      { token: 't', component: 'table.filters' },
    )

    render(Wrapper, { props: { component: FormHarness, props: { store } } })

    // The rule editor's code loads lazily.
    await waitFor(() => expect(screen.getByLabelText('Value')).toBeInTheDocument())
    await fireEvent.input(screen.getByLabelText('Value'), { target: { value: 'news' } })
    await fireEvent.click(screen.getByRole('button', { name: 'or' }))

    expect(store.state.values).toEqual({
      queryBuilder: {
        query: {
          combinator: 'or',
          rules: [
            { type: 'constraint', constraint: 'title', operator: 'contains', value: 'news' },
            { type: 'constraint', constraint: 'title', operator: 'is_blank' },
          ],
        },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Add group' }))

    const rules = (store.state.values.queryBuilder as { query: { rules: unknown[] } }).query.rules
    expect(rules[2]).toEqual({
      type: 'group',
      combinator: 'and',
      rules: [{ type: 'constraint', constraint: 'title', operator: 'contains' }],
    })
    expect(screen.getAllByRole('button', { name: 'Add group' })).toHaveLength(1)
  })
})
