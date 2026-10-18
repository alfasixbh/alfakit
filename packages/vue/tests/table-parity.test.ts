import type { TableSchema } from '@alfakit/core'
import type { VueWrapper } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import DataTable from '../src/components/table/DataTable.vue'
import TableCellContent from '../src/components/table/TableCellContent.vue'
import TableFilters from '../src/components/table/TableFilters.vue'
import { actions, flush, mountWithAlfakit, setPageProps } from './mocks'

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

const rowCheckboxes = (wrapper: VueWrapper) =>
  wrapper.findAll('button[role="checkbox"][aria-label="Select row"]')

const labelled = (root: ParentNode, text: string) =>
  [...root.querySelectorAll('label')].some((label) => label.textContent?.includes(text))

const options = () => [...document.body.querySelectorAll('[role="option"]')]
const option = (name: string) => options().find((item) => item.textContent?.trim() === name)

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
  it('renders cards with column labels below md', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(DataTable, { table: { ...base, stackedOnMobile: true } }),
    )

    const table = wrapper.find('table')
    expect(table.attributes('data-stacked-on-mobile')).toBe('true')
    expect(table.classes()).toContain('max-md:block')

    const row = wrapper.findAll('tbody tr').find((item) => item.text().includes('One'))!
    expect(row.classes()).toContain('max-md:flex-col')
    // Each cell repeats its column label, hidden from md up and from screen readers.
    const label = row.findAll('span[aria-hidden="true"]').find((item) => item.text() === 'Title')!
    expect(label.classes()).toContain('md:hidden')
    // Selection keeps working.
    await rowCheckboxes(wrapper)[0]!.trigger('click')
    expect(rowCheckboxes(wrapper)[0]!.attributes('data-state')).toBe('checked')

    wrapper.unmount()
  })

  it('leaves regular tables alone', () => {
    const wrapper = mountWithAlfakit(() => h(DataTable, { table: base }))

    expect(wrapper.find('table').attributes('data-stacked-on-mobile')).toBeUndefined()

    wrapper.unmount()
  })
})

describe('selection safeguards', () => {
  it('stops selecting at maxSelectableRecords and hides "select all"', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(DataTable, { table: { ...base, maxSelectableRecords: 2 } }),
    )

    await rowCheckboxes(wrapper)[0]!.trigger('click')
    await rowCheckboxes(wrapper)[1]!.trigger('click')

    expect(rowCheckboxes(wrapper)[2]!.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).not.toContain('Select all')
    expect(wrapper.text()).toContain('You can select up to 2 records')

    wrapper.unmount()
  })

  it('selects one group at a time under selectGroupsOnly', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(DataTable, {
        table: {
          ...base,
          selectGroupsOnly: true,
          grouping: { group: 'status', label: 'Status', direction: 'asc' } as never,
          recordGroups: [
            { key: 'a', title: 'Draft' },
            { key: 'b', title: 'Live' },
          ] as never,
        },
      }),
    )

    expect(wrapper.find('[aria-label="Select page"]').exists()).toBe(false)

    await wrapper.find('button[role="checkbox"][aria-label="Select group Draft"]').trigger('click')
    expect(rowCheckboxes(wrapper)[0]!.attributes('data-state')).toBe('checked')
    expect(rowCheckboxes(wrapper)[1]!.attributes('data-state')).toBe('checked')

    // A record of another group starts a new selection.
    await rowCheckboxes(wrapper)[2]!.trigger('click')
    expect(rowCheckboxes(wrapper)[0]!.attributes('data-state')).toBe('unchecked')
    expect(rowCheckboxes(wrapper)[2]!.attributes('data-state')).toBe('checked')

    wrapper.unmount()
  })

  it('sends the selection to record actions that accessSelectedRecords', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined as never)

    const wrapper = mountWithAlfakit(() =>
      h(DataTable, {
        table: {
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
        },
      }),
    )

    await rowCheckboxes(wrapper)[1]!.trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Copy')!
      .trigger('click')
    await flush()

    expect(trigger).toHaveBeenCalled()
    expect(trigger.mock.calls[0]![1]).toMatchObject({
      record: 1,
      arguments: { alfakitSelectedRecords: ['2'] },
    })
    trigger.mockRestore()
    wrapper.unmount()
  })
})

describe('filter layouts', () => {
  it('renders sidebar filters after the table', () => {
    const wrapper = mountWithAlfakit(() =>
      h(DataTable, { table: { ...base, ...filters, filtersLayout: 'after-content' } }),
    )

    const layout = wrapper.element.ownerDocument.querySelector(
      '[data-slot="table-filters-layout"]',
    )!
    const sidebar = layout.querySelector('[data-slot="table-filters-sidebar"]')!

    expect(layout.lastElementChild).toBe(sidebar)
    expect(labelled(sidebar, 'Title contains')).toBe(true)

    wrapper.unmount()
  })

  it('collapses sidebar filters when collapsible', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(TableFilters, {
        table: {
          ...base,
          ...filters,
          filtersLayout: 'before-content-collapsible',
          filtersFormWidth: 'sm',
        },
        component: 'table',
      }),
    )

    const sidebar = wrapper.find('aside[aria-label="Filters"]')
    expect(sidebar.classes()).toContain('lg:w-sm')
    expect(labelled(sidebar.element, 'Title contains')).toBe(false)

    await sidebar.find('button[aria-expanded]').trigger('click')
    expect(labelled(wrapper.find('aside').element, 'Title contains')).toBe(true)

    wrapper.unmount()
  })

  it('renders the filtersFormSchema layout', () => {
    const wrapper = mountWithAlfakit(() =>
      h(TableFilters, {
        table: {
          ...base,
          ...filters,
          filtersLayout: 'above-content',
          filtersFormSchema: [
            {
              type: 'Section',
              key: 'visibility',
              heading: 'Visibility',
              schema: [{ type: 'Group', key: 'filter:title', schema: filters.filters![0]!.schema }],
            } as never,
          ],
        },
        component: 'table',
      }),
    )

    expect(wrapper.text()).toContain('Visibility')
    expect(labelled(wrapper.element.parentNode!, 'Title contains')).toBe(true)

    wrapper.unmount()
  })

  it('hides filter indicators', () => {
    const wrapper = mountWithAlfakit(() =>
      h(DataTable, {
        table: {
          ...base,
          ...filters,
          filterIndicators: [{ filter: 'title', label: 'Title: One' }],
          hiddenFilterIndicators: true,
        },
      }),
    )

    expect(wrapper.text()).not.toContain('Title: One')

    wrapper.unmount()
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
    const wrapper = mountWithAlfakit(() =>
      h(TableCellContent, {
        column: column as never,
        cell: { state: '1' },
        recordKey: 3,
        token: 't',
        component: 'table',
      }),
    )

    const trigger = wrapper.find('[role="combobox"][aria-label="Author"]')
    expect(trigger.find('b').text()).toBe('Ada')

    await trigger.trigger('click')
    await nextTick()
    expect(option('Alan')).toBeUndefined()
    expect(option('Grace')).toBeDefined()

    const input = document.body.querySelector<HTMLInputElement>(
      'input[placeholder="Type to search…"]',
    )!
    input.value = 'ad'
    input.dispatchEvent(new Event('input'))
    await nextTick()
    await nextTick()

    expect(option('Ada')).toBeDefined()
    expect(option('Grace')).toBeUndefined()

    wrapper.unmount()
  })

  it('searches remote options on the server and shows the current label', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ options: [{ value: '9', label: 'Margaret' }] }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers()

    const wrapper = mountWithAlfakit(() =>
      h(TableCellContent, {
        column: { ...column, options: [], optionsSearchPath: '__columnOptions.author_id' } as never,
        cell: { state: '7', optionLabel: 'Katherine' },
        recordKey: 1,
        token: 't',
        component: 'table',
      }),
    )

    const trigger = wrapper.find('[role="combobox"][aria-label="Author"]')
    expect(trigger.text()).toContain('Katherine')

    await trigger.trigger('click')
    await vi.advanceTimersByTimeAsync(350)
    vi.useRealTimers()
    await flush()
    await nextTick()

    expect(option('Margaret')).toBeDefined()
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain('component=table.filters')

    vi.unstubAllGlobals()
    wrapper.unmount()
  })
})

describe('image column alt text', () => {
  it('uses the alt text of the cell', () => {
    const wrapper = mountWithAlfakit(() =>
      h(TableCellContent, {
        column: { type: 'ImageColumn', name: 'avatar', label: 'Avatar' },
        cell: { state: ['/a.png'], alt: 'Ada Lovelace' },
        recordKey: 1,
        token: 't',
        component: 'table',
      }),
    )

    const image = wrapper.find('img')
    expect(image.attributes('alt')).toBe('Ada Lovelace')
    expect(image.attributes('src')).toBe('/a.png')

    wrapper.unmount()
  })
})
