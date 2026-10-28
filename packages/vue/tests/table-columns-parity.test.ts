import { FormStore, type CellSchema, type ColumnSchema, type TableSchema } from '@alfakit/core'
import { defineComponent, h, reactive } from 'vue'
import ImageEntryComponent from '../src/components/entries/ImageEntryComponent.vue'
import QueryBuilderRulesField from '../src/components/fields/QueryBuilderRulesField.vue'
import { provideForm } from '../src/components/form/form-context'
import DataTable from '../src/components/table/DataTable.vue'
import TableCellContent from '../src/components/table/TableCellContent.vue'
import TableSummaryFooter from '../src/components/table/TableSummaryFooter.vue'
import { flush, mountWithAlfakit } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

function cell(column: ColumnSchema, data: CellSchema) {
  return mountWithAlfakit(() =>
    h(TableCellContent, { column, cell: data, recordKey: 1, token: 't', component: 'table' }),
  )
}

describe('column parity', () => {
  it('names editable cells after their column and ties the error to them', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ message: 'Invalid', errors: { state: ['Too low'] } }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const price = cell(
      {
        type: 'TextInputColumn',
        name: 'price',
        label: 'Price',
        editable: true,
        inputType: 'number',
      } as ColumnSchema,
      { state: '10' },
    )
    const status = cell(
      {
        type: 'SelectColumn',
        name: 'status',
        label: 'Status',
        editable: true,
        native: true,
        options: [{ value: 'a', label: 'A' }],
      } as ColumnSchema,
      { state: 'a' },
    )

    expect(status.find('select').attributes('aria-label')).toBe('Status')

    const input = price.find('input')
    expect(input.attributes('aria-label')).toBe('Price')

    await input.setValue('-5')
    await input.trigger('blur')
    await flush()

    const describedBy = input.attributes('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy as string)?.textContent).toBe('Too low')
    vi.unstubAllGlobals()
  })

  it('copies a color column swatch with the copy message and duration', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText } })
    const wrapper = cell(
      {
        type: 'ColorColumn',
        name: 'c',
        label: 'Colour',
        copyable: true,
        copyMessage: 'Hex copied',
        copyMessageDuration: 500,
        wrap: true,
      } as ColumnSchema,
      { state: ['#ff0000', '#00ff00'] },
    )
    const button = wrapper.find('button[aria-label="Copy #ff0000"]')

    await button.trigger('click')
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(writeText).toHaveBeenCalledWith('#ff0000')
    expect(wrapper.find('[role="status"]').text()).toBe('Hex copied')
    expect(button.element.parentElement?.className).toContain('flex-wrap')

    vi.advanceTimersByTime(600)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    vi.useRealTimers()
    wrapper.unmount()
  })

  it('renders no copy button without copyable()', () => {
    const wrapper = cell({ type: 'ColorColumn', name: 'c', label: 'Colour' }, { state: '#fff' })

    expect(wrapper.find('button').exists()).toBe(false)
    wrapper.unmount()
  })

  it('renders one icon per list item and wraps them', async () => {
    const wrapper = cell(
      { type: 'IconColumn', name: 'i', label: 'I', wrap: true } as ColumnSchema,
      {
        icons: [
          { icon: 'circle-check', color: 'warning' },
          { icon: 'circle-x', color: null },
        ],
      },
    )
    const group = wrapper.find('[data-slot="icon-column-icons"]')

    expect(group.classes()).toContain('flex-wrap')
    await vi.waitFor(() =>
      expect(group.element.querySelectorAll('svg, [data-slot="icon"]')).toHaveLength(2),
    )
    wrapper.unmount()
  })

  it('sizes the image remaining text and wraps images', () => {
    const wrapper = cell(
      {
        type: 'ImageColumn',
        name: 'a',
        label: 'A',
        limit: 1,
        limitedRemainingText: true,
        limitedRemainingTextSize: 'lg',
        wrap: true,
      } as ColumnSchema,
      { state: ['/1.png', '/2.png', '/3.png'] },
    )
    const remaining = wrapper.find('[data-slot="image-remaining"]')

    expect(remaining.classes()).toContain('text-lg')
    expect(remaining.text()).toBe('+2')
    expect(wrapper.find('img').element.parentElement?.className).toContain('flex-wrap')
    wrapper.unmount()
  })

  it('keeps the remaining text clear of the last stacked image (W-S3-03)', () => {
    const column = cell(
      {
        type: 'ImageColumn',
        name: 'a',
        label: 'A',
        limit: 1,
        limitedRemainingText: true,
        stacked: true,
        circular: true,
      } as ColumnSchema,
      { state: ['/1.png', '/2.png'] },
    )
    expect(column.find('[data-slot="image-remaining"]').classes()).toContain('ms-3')
    column.unmount()

    const entry = mountWithAlfakit(() =>
      h(ImageEntryComponent, {
        component: {
          type: 'ImageEntry',
          key: 'a',
          name: 'a',
          state: ['/1.png', '/2.png'],
          limit: 1,
          stacked: true,
          circular: true,
        },
      }),
    )
    expect(entry.find('[data-slot="image-remaining"]').classes()).toContain('ms-3')
    entry.unmount()
  })

  it('hides the image entry remaining text with limitedRemainingText(false)', () => {
    const shown = mountWithAlfakit(() =>
      h(ImageEntryComponent, {
        component: {
          type: 'ImageEntry',
          key: 'a',
          name: 'a',
          state: ['/1.png', '/2.png'],
          limit: 1,
          limitedRemainingTextSize: 'xs',
        },
      }),
    )
    expect(shown.find('[data-slot="image-remaining"]').classes()).toContain('text-xs')
    shown.unmount()

    const hidden = mountWithAlfakit(() =>
      h(ImageEntryComponent, {
        component: {
          type: 'ImageEntry',
          key: 'b',
          name: 'b',
          state: ['/1.png', '/2.png'],
          limit: 1,
          limitedRemainingText: false,
        },
      }),
    )
    expect(hidden.find('[data-slot="image-remaining"]').exists()).toBe(false)
    hidden.unmount()
  })

  it('saves a text input cell changed back to its earlier value after a reload', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const data = reactive<CellSchema>({ state: '364' })
    const wrapper = mountWithAlfakit(() =>
      h(TableCellContent, {
        column: {
          type: 'TextInputColumn',
          name: 'views',
          label: 'Views',
          inputType: 'number',
        } as ColumnSchema,
        cell: data,
        recordKey: 1,
        token: 't',
        component: 'table',
      }),
    )
    const input = wrapper.find('input')

    await input.setValue('777')
    await input.trigger('blur')
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // The table reloads with the saved value; the user types the old value again.
    data.state = '777'
    await flush()
    await input.setValue('364')
    await input.trigger('blur')
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    wrapper.unmount()
    vi.unstubAllGlobals()
  })

  it('renders text input column prefix and suffix text', () => {
    const wrapper = cell(
      {
        type: 'TextInputColumn',
        name: 'p',
        label: 'P',
        editable: true,
        inputType: 'text',
      } as ColumnSchema,
      { state: '10', prefix: '$', suffix: 'USD' },
    )

    expect(wrapper.find('[data-slot="input-prefix"]').text()).toBe('$')
    expect(wrapper.find('[data-slot="input-suffix"]').text()).toBe('USD')
    expect(wrapper.find('[data-slot="input-group"] input').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('summaries', () => {
  const table: TableSchema = {
    type: 'Table',
    modelLabel: 'post',
    pluralModelLabel: 'posts',
    columns: [{ type: 'IconColumn', name: 'done', label: 'Done' }],
    visibleColumns: ['done'],
    filtersLayout: 'dropdown',
    recordActionsPosition: 'after-columns',
    searchPlaceholder: 'Search',
    searchDebounce: 500,
    emptyState: { heading: 'None', icon: 'inbox' },
    summaries: {
      all: {
        label: 'All posts',
        values: {
          done: [
            {
              label: 'Count',
              hiddenLabel: true,
              value: null,
              icons: [
                { icon: 'circle-check', color: 'success', count: 3 },
                { icon: 'circle-x', color: 'danger', count: 1 },
              ],
            },
          ],
        },
      },
    },
  }

  it('renders icon counts and keeps hidden labels for screen readers', () => {
    const wrapper = mountWithAlfakit(() =>
      h('table', [
        h(TableSummaryFooter, { table, columns: table.columns, leading: 0, trailing: 0 }),
      ]),
    )
    const label = wrapper.findAll('span').find((span) => span.text() === 'Count')

    expect(label?.classes()).toContain('sr-only')
    expect(wrapper.find('[data-slot="summary-icons"]').text().replace(/\s/g, '')).toBe('31')
    wrapper.unmount()
  })
})

describe('content layout grid spans', () => {
  it('applies columnSpan classes to columns inside a grid', () => {
    const table: TableSchema = {
      type: 'Table',
      modelLabel: 'post',
      pluralModelLabel: 'posts',
      columns: [
        { type: 'TextColumn', name: 'title', label: 'Title' },
        { type: 'TextColumn', name: 'body', label: 'Body' },
      ],
      visibleColumns: ['title', 'body'],
      contentLayout: [
        {
          type: 'Grid',
          columns: { default: 1, lg: 3 },
          schema: [
            { type: 'Column', name: 'title', columnSpan: { lg: 2 } },
            { type: 'Column', name: 'body', columnSpan: { default: 'full' } },
          ],
        },
      ],
      filtersLayout: 'dropdown',
      recordActionsPosition: 'after-columns',
      records: [{ key: 1, cells: { title: { state: 'Hi' }, body: { state: 'There' } } }],
      searchPlaceholder: 'Search',
      searchDebounce: 500,
      emptyState: { heading: 'None', icon: 'inbox' },
    }
    const wrapper = mountWithAlfakit(() => h(DataTable, { table }))

    // Inside a record, `lg` reads the record's width (`@md`, core `RECORD_CONTAINER_FROM`).
    expect(wrapper.find('[data-layout="grid"]').classes()).toContain('@md:grid-cols-3')
    expect(wrapper.find('[data-column="title"]').classes()).toContain('@md:col-span-2')
    expect(wrapper.find('[data-column="body"]').classes()).toContain('col-span-full')
    wrapper.unmount()
  })
})

describe('query builder', () => {
  const field = {
    type: 'QueryBuilderRules' as const,
    key: 'queryBuilder.query',
    name: 'query',
    statePath: 'queryBuilder.query',
    maxDepth: 1,
    constraintPickerColumns: { default: 2 },
    constraintPickerWidth: 'lg',
    constraints: [
      {
        name: 'status',
        label: 'Status',
        type: 'select' as const,
        icon: 'tag',
        searchable: true,
        options: [
          { value: 'draft', label: 'Draft' },
          { value: 'published', label: 'Published' },
        ],
        operators: [
          { name: 'is', label: 'is', input: 'select' },
          {
            name: 'level',
            label: 'has level',
            input: 'select',
            options: [{ value: 'high', label: 'High' }],
          },
        ],
      },
      {
        name: 'published_at',
        label: 'Published at',
        type: 'date' as const,
        operators: [
          { name: 'is_month', label: 'is month', input: 'month' },
          { name: 'is_year', label: 'is year', input: 'year' },
          { name: 'is_after', label: 'is after', input: 'datetime' },
        ],
      },
    ],
  }

  function mountField(rules: unknown[]) {
    const store = new FormStore(
      {
        components: [field as never],
        state: { queryBuilder: { query: { combinator: 'and', rules } } },
      },
      { token: 't', component: 'table.filters' },
    )
    const Form = defineComponent({
      setup() {
        provideForm(store)

        return () => h(QueryBuilderRulesField, { component: field as never })
      },
    })

    return mountWithAlfakit(() => h(Form))
  }

  it('filters searchable options and uses custom operator options', async () => {
    const wrapper = mountField([
      { type: 'constraint', constraint: 'status', operator: 'is' },
      { type: 'constraint', constraint: 'status', operator: 'level' },
    ])

    await wrapper.findAll('input[aria-label="Search options"]')[0]!.setValue('pub')
    await flush()
    const selects = wrapper.findAll('select[aria-label="Value"]')

    expect(selects[0]!.findAll('option').map((o) => o.text())).toEqual(['Select…', 'Published'])
    expect(selects[1]!.findAll('option').map((o) => o.text())).toEqual(['Select…', 'High'])
    wrapper.unmount()
  })

  it('renders month, year and datetime inputs', () => {
    const wrapper = mountField([
      { type: 'constraint', constraint: 'published_at', operator: 'is_month' },
      { type: 'constraint', constraint: 'published_at', operator: 'is_year' },
      { type: 'constraint', constraint: 'published_at', operator: 'is_after' },
    ])
    const types = wrapper.findAll('input').map((input) => (input.element as HTMLInputElement).type)

    expect(types).toEqual(['month', 'number', 'datetime-local'])
    wrapper.unmount()
  })
})
