import { FormStore, type CellSchema, type ColumnSchema, type TableSchema } from '@alfakit/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { tick } from 'svelte'
import ImageEntryComponent from '../src/components/entries/ImageEntryComponent.svelte'
import DataTable from '../src/components/table/DataTable.svelte'
import TableCellContent from '../src/components/table/TableCellContent.svelte'
import TableSummaryFooter from '../src/components/table/TableSummaryFooter.svelte'
import FormHarness from './FormHarness.svelte'
import Wrapper from './Wrapper.svelte'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

const cell = (column: ColumnSchema, data: CellSchema) =>
  render(Wrapper, {
    props: {
      component: TableCellContent,
      props: { column, cell: data, recordKey: 1, token: 't', component: 'table' },
    },
  })

describe('column parity', () => {
  it('copies a color column swatch with the copy message and duration', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText } })
    cell(
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
    const button = screen.getByRole('button', { name: 'Copy #ff0000' })

    await fireEvent.click(button)
    await Promise.resolve()
    await tick()

    expect(writeText).toHaveBeenCalledWith('#ff0000')
    expect(screen.getByRole('status')).toHaveTextContent('Hex copied')
    expect(button.parentElement).toHaveClass('flex-wrap')

    vi.advanceTimersByTime(600)
    await tick()
    expect(screen.queryByRole('status')).toBeNull()
    vi.useRealTimers()
  })

  it('renders no copy button without copyable()', () => {
    cell({ type: 'ColorColumn', name: 'c', label: 'Colour' }, { state: '#fff' })

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders one icon per list item and wraps them', async () => {
    const { container } = cell(
      { type: 'IconColumn', name: 'i', label: 'I', wrap: true } as ColumnSchema,
      {
        icons: [
          { icon: 'circle-check', color: 'warning' },
          { icon: 'circle-x', color: null },
        ],
      },
    )
    const group = container.querySelector('[data-slot="icon-column-icons"]')

    expect(group).toHaveClass('flex-wrap')
    await vi.waitFor(() =>
      expect(group?.querySelectorAll('svg, [data-slot="icon"]')).toHaveLength(2),
    )
  })

  it('sizes the image remaining text and wraps images', () => {
    const { container } = cell(
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
    const remaining = container.querySelector('[data-slot="image-remaining"]')

    expect(remaining).toHaveClass('text-lg')
    expect(remaining).toHaveTextContent('+2')
    expect(container.querySelector('img')?.parentElement).toHaveClass('flex-wrap')
  })

  it('hides the image entry remaining text with limitedRemainingText(false)', () => {
    const shown = render(Wrapper, {
      props: {
        component: ImageEntryComponent,
        props: {
          component: {
            type: 'ImageEntry',
            key: 'a',
            state: ['/1.png', '/2.png'],
            limit: 1,
            limitedRemainingTextSize: 'xs',
          },
        },
      },
    })
    expect(shown.container.querySelector('[data-slot="image-remaining"]')).toHaveClass('text-xs')

    const hidden = render(Wrapper, {
      props: {
        component: ImageEntryComponent,
        props: {
          component: {
            type: 'ImageEntry',
            key: 'b',
            state: ['/1.png', '/2.png'],
            limit: 1,
            limitedRemainingText: false,
          },
        },
      },
    })
    expect(hidden.container.querySelector('[data-slot="image-remaining"]')).toBeNull()
  })

  it('renders text input column prefix and suffix text', () => {
    const { container } = cell(
      {
        type: 'TextInputColumn',
        name: 'p',
        label: 'P',
        editable: true,
        inputType: 'text',
      } as ColumnSchema,
      { state: '10', prefix: '$', suffix: 'USD' },
    )

    expect(container.querySelector('[data-slot="input-prefix"]')).toHaveTextContent('$')
    expect(container.querySelector('[data-slot="input-suffix"]')).toHaveTextContent('USD')
    expect(container.querySelector('[data-slot="input-group"] input')).not.toBeNull()
  })
})

describe('summaries', () => {
  it('renders icon counts and keeps hidden labels for screen readers', () => {
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
    const { container } = render(Wrapper, {
      props: {
        component: TableSummaryFooter,
        props: { table, columns: table.columns, leading: 0, trailing: 0 },
      },
    })

    expect(screen.getByText('Count')).toHaveClass('sr-only')
    expect(
      container.querySelector('[data-slot="summary-icons"]')?.textContent?.replace(/\s/g, ''),
    ).toBe('31')
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
    const { container } = render(Wrapper, { props: { component: DataTable, props: { table } } })

    expect(container.querySelector('[data-column="title"]')).toHaveClass('lg:col-span-2')
    expect(container.querySelector('[data-column="body"]')).toHaveClass('col-span-full')
  })
})

describe('query builder', () => {
  const field = {
    type: 'QueryBuilderRules',
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
        type: 'select',
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
        type: 'date',
        operators: [
          { name: 'is_month', label: 'is month', input: 'month' },
          { name: 'is_year', label: 'is year', input: 'year' },
          { name: 'is_after', label: 'is after', input: 'datetime' },
        ],
      },
    ],
  }

  const mountField = async (rules: unknown[]) => {
    const store = new FormStore(
      {
        components: [field as never],
        state: { queryBuilder: { query: { combinator: 'and', rules } } },
      },
      { token: 't', component: 'table.filters' },
    )

    const view = render(Wrapper, { props: { component: FormHarness, props: { store } } })

    // The rule editor's code loads lazily.
    await waitFor(() =>
      expect(view.container.querySelector('[data-slot="field-placeholder"]')).toBeNull(),
    )

    return view
  }

  it('filters searchable options and uses custom operator options', async () => {
    await mountField([
      { type: 'constraint', constraint: 'status', operator: 'is' },
      { type: 'constraint', constraint: 'status', operator: 'level' },
    ])

    await fireEvent.input(screen.getAllByLabelText('Search options')[0]!, {
      target: { value: 'pub' },
    })
    const selects = screen.getAllByRole('combobox', { name: 'Value' })

    expect(Array.from(selects[0]!.querySelectorAll('option')).map((o) => o.textContent)).toEqual([
      'Select…',
      'Published',
    ])
    expect(Array.from(selects[1]!.querySelectorAll('option')).map((o) => o.textContent)).toEqual([
      'Select…',
      'High',
    ])
  })

  it('renders month, year and datetime inputs', async () => {
    const { container } = await mountField([
      { type: 'constraint', constraint: 'published_at', operator: 'is_month' },
      { type: 'constraint', constraint: 'published_at', operator: 'is_year' },
      { type: 'constraint', constraint: 'published_at', operator: 'is_after' },
    ])
    const types = Array.from(container.querySelectorAll('input')).map((input) => input.type)

    expect(types).toEqual(['month', 'number', 'datetime-local'])
  })
})
