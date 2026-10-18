import { FormStore, type TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { defineComponent, h } from 'vue'
import QueryBuilderRulesField from '../src/components/fields/QueryBuilderRulesField.vue'
import { provideForm } from '../src/components/form/form-context'
import DataTable from '../src/components/table/DataTable.vue'
import TableFilters from '../src/components/table/TableFilters.vue'
import { flush, mountWithAlfakit, setPageProps } from './mocks'

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
  it('renders summary rows, group headings and group summaries', () => {
    const wrapper = mountWithAlfakit(() => h(DataTable, { table: grouped }))

    const footer = wrapper.findAll('tfoot [data-slot="table-summary"]')
    expect(footer).toHaveLength(2)
    expect(footer[0]!.text()).toContain('This page')
    expect(footer[1]!.text()).toContain('12')
    expect(footer[1]!.findAll('td')[1]!.classes()).toContain('text-end')
    expect(wrapper.findAll('[data-slot="table-group"]')).toHaveLength(2)
    expect(wrapper.findAll('tbody [data-slot="table-summary"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Live')
    expect(wrapper.find('button[aria-label="Collapse group: Status: draft"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('collapses a group', async () => {
    const wrapper = mountWithAlfakit(() => h(DataTable, { table: grouped }))

    await wrapper.find('button[aria-label="Collapse group: Status: draft"]').trigger('click')

    expect(wrapper.text()).not.toContain('Beta')
    expect(wrapper.text()).toContain('Alpha')
    expect(
      wrapper.find('button[aria-label="Expand group: Status: draft"]').attributes('aria-expanded'),
    ).toBe('false')

    wrapper.unmount()
  })

  it('shows only headings for groups-only tables', () => {
    const wrapper = mountWithAlfakit(() =>
      h(DataTable, {
        table: { ...grouped, records: [], grouping: { ...grouped.grouping!, groupsOnly: true } },
      }),
    )

    expect(wrapper.text()).not.toContain('No posts')
    expect(wrapper.findAll('[data-slot="table-group"]')).toHaveLength(2)
    expect(wrapper.find('button[aria-label^="Collapse group"]').exists()).toBe(false)

    wrapper.unmount()
  })
})

describe('deferred filters', () => {
  it('waits for Apply before reloading', async () => {
    vi.useFakeTimers()

    const wrapper = mountWithAlfakit(() =>
      h(TableFilters, {
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
                } as never,
              ],
            },
          ],
        },
      }),
    )

    const apply = () => wrapper.findAll('button').find((button) => button.text() === 'Apply')!

    expect(apply().attributes('disabled')).toBeDefined()

    await wrapper.find('input').setValue('Hel')
    vi.advanceTimersByTime(1000)
    expect(router.visit).not.toHaveBeenCalled()

    await apply().trigger('click')

    expect(router.visit).toHaveBeenCalledTimes(1)
    expect(String(vi.mocked(router.visit).mock.calls[0]![0])).toContain(
      'filters%5Btitle%5D%5Bvalue%5D=Hel',
    )

    vi.useRealTimers()
    wrapper.unmount()
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
    ],
  }

  it('edits values and combinators and adds nested groups', async () => {
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
    const Form = defineComponent({
      setup() {
        provideForm(store)

        return () => h(QueryBuilderRulesField, { component: field as never })
      },
    })
    const wrapper = mountWithAlfakit(() => h(Form))

    await wrapper.find('input[aria-label="Value"]').setValue('news')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'or')!
      .trigger('click')
    await flush()

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

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Add group'))!
      .trigger('click')
    await flush()

    const rules = (store.state.values.queryBuilder as { query: { rules: unknown[] } }).query.rules
    expect(rules[2]).toEqual({
      type: 'group',
      combinator: 'and',
      rules: [{ type: 'constraint', constraint: 'title', operator: 'contains' }],
    })
    // maxDepth 1: only the root group can add groups.
    expect(
      wrapper.findAll('button').filter((button) => button.text().includes('Add group')),
    ).toHaveLength(1)

    wrapper.unmount()
  })
})
