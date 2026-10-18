import type { CellSchema, ColumnSchema, TableSchema } from '@alfakit/core'
import { FormStore } from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ImageEntryComponent } from '../src/components/entries/other-entries'
import { TextEntryComponent } from '../src/components/entries/text-entry'
import { QueryBuilderRulesField } from '../src/components/fields/query-builder-rules'
import { FormProvider } from '../src/components/form/form-context'
import { TableCellContent } from '../src/components/table/cells'
import { TableSummaryFooter } from '../src/components/table/summary-rows'
import { DataTable } from '../src/components/table/table-block'
import { Wrapper, setPageProps } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

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

function cell(column: ColumnSchema, data: CellSchema) {
  return render(
    <Wrapper>
      <TableCellContent column={column} cell={data} recordKey={1} token="t" component="table" />
    </Wrapper>,
  )
}

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
    await act(async () => {
      fireEvent.click(button)
      await Promise.resolve()
    })

    expect(writeText).toHaveBeenCalledWith('#ff0000')
    expect(screen.getByRole('status')).toHaveTextContent('Hex copied')
    expect(button.parentElement).toHaveClass('flex-wrap')

    act(() => vi.advanceTimersByTime(600))
    expect(screen.queryByRole('status')).toBeNull()
    vi.useRealTimers()
  })

  it('renders no copy button on a color column without copyable()', () => {
    cell({ type: 'ColorColumn', name: 'c', label: 'Colour' }, { state: '#fff' })

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders one icon per item of a list state and wraps them', async () => {
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
    await waitFor(() => expect(group?.children).toHaveLength(2))
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

    expect(container.querySelector('[data-slot="image-remaining"]')).toHaveClass('text-lg')
    expect(container.querySelector('[data-slot="image-remaining"]')).toHaveTextContent('+2')
    expect(container.querySelector('img')?.parentElement).toHaveClass('flex-wrap')
  })

  it('hides the image entry remaining text with limitedRemainingText(false)', () => {
    const shown = render(
      <Wrapper>
        <ImageEntryComponent
          component={{
            type: 'ImageEntry',
            key: 'a',
            state: ['/1.png', '/2.png'],
            limit: 1,
            limitedRemainingTextSize: 'xs',
          }}
        />
      </Wrapper>,
    )
    expect(shown.container.querySelector('[data-slot="image-remaining"]')).toHaveClass('text-xs')

    const hidden = render(
      <Wrapper>
        <ImageEntryComponent
          component={{
            type: 'ImageEntry',
            key: 'b',
            state: ['/1.png', '/2.png'],
            limit: 1,
            limitedRemainingText: false,
          }}
        />
      </Wrapper>,
    )
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

  it('honours copyMessageDuration on text entries', async () => {
    vi.useFakeTimers()
    Object.assign(navigator, { clipboard: { writeText: vi.fn(() => Promise.resolve()) } })
    render(
      <Wrapper>
        <TextEntryComponent
          component={{
            type: 'TextEntry',
            key: 't',
            state: 'abc',
            copyable: true,
            copyMessage: 'Done',
            copyMessageDuration: 3000,
          }}
        />
      </Wrapper>,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
      await Promise.resolve()
    })
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByRole('status')).toHaveTextContent('Done')
    act(() => vi.advanceTimersByTime(1500))
    expect(screen.queryByRole('status')).toBeNull()
    vi.useRealTimers()
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
    const { container } = render(
      <Wrapper>
        <table>
          <TableSummaryFooter table={table} columns={table.columns} leading={0} trailing={0} />
        </table>
      </Wrapper>,
    )

    expect(screen.getByText('Count')).toHaveClass('sr-only')
    expect(container.querySelector('[data-slot="summary-icons"]')).toHaveTextContent('31')
  })

  it('renders no footer when both rows are hidden', () => {
    const { container } = render(
      <Wrapper>
        <table>
          <TableSummaryFooter
            table={{ ...table, summaries: {} }}
            columns={table.columns}
            leading={0}
            trailing={0}
          />
        </table>
      </Wrapper>,
    )

    expect(container.querySelector('tfoot')).toBeNull()
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

    const { container } = render(
      <Wrapper>
        <DataTable table={table} />
      </Wrapper>,
    )

    expect(container.querySelector('[data-column="title"]')).toHaveClass('lg:col-span-2')
    expect(container.querySelector('[data-column="body"]')).toHaveClass('col-span-full')
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

  function renderField(state: Record<string, unknown> = {}) {
    const store = new FormStore(
      { components: [field as never], state, columns: { default: 1 } },
      { token: 't', component: 'table.filters' },
    )

    const view = render(
      <Wrapper>
        <FormProvider store={store}>
          <QueryBuilderRulesField component={field as never} />
        </FormProvider>
      </Wrapper>,
    )

    return { store, ...view }
  }

  it('filters searchable options and uses custom operator options', () => {
    const { container } = renderField({
      queryBuilder: {
        query: {
          combinator: 'and',
          rules: [
            { type: 'constraint', constraint: 'status', operator: 'is' },
            { type: 'constraint', constraint: 'status', operator: 'level' },
          ],
        },
      },
    })
    const searches = container.querySelectorAll('[data-slot="query-builder-search"]')

    fireEvent.change(searches[0]!, { target: { value: 'pub' } })
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

  it('renders month, year and datetime inputs', () => {
    const { container } = renderField({
      queryBuilder: {
        query: {
          combinator: 'and',
          rules: [
            { type: 'constraint', constraint: 'published_at', operator: 'is_month' },
            { type: 'constraint', constraint: 'published_at', operator: 'is_year' },
            { type: 'constraint', constraint: 'published_at', operator: 'is_after' },
          ],
        },
      },
    })
    const types = Array.from(container.querySelectorAll('input')).map((input) => input.type)

    expect(types).toEqual(['month', 'number', 'datetime-local'])
  })

  it('shows constraint icons in a sized grid picker', async () => {
    renderField()

    fireEvent.pointerDown(screen.getByRole('button', { name: /Add rule/ }), {
      button: 0,
      ctrlKey: false,
    })
    const picker = await screen.findByText('Status')
    const grid = picker.closest('[data-slot="query-builder-constraint-picker"]')

    expect(grid).toHaveClass('grid', 'grid-cols-2')
    expect(grid?.parentElement).toHaveClass('w-lg')
    expect(picker.closest('[role="menuitem"]')?.querySelector('svg')).not.toBeNull()
  })
})
