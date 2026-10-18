import type { TableRecordSchema, TableSchema } from '../src/schema/table'
import {
  coerceSpreadsheetValue,
  parseTsv,
  saveSpreadsheetChanges,
  spreadsheetColumns,
  SpreadsheetGrid,
  spreadsheetRows,
  toTsv,
  type SpreadsheetColumn,
} from '../src/spreadsheet'

const table = {
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
        { label: 'Live', options: [{ value: 'published', label: 'Published' }] },
      ],
    },
    { type: 'ToggleColumn', name: 'featured', label: 'Featured', editable: true },
    { type: 'TextColumn', name: 'id', label: 'ID' },
    { type: 'TextInputColumn', name: 'price', label: 'Price', editable: true, inputType: 'number' },
  ],
  visibleColumns: ['title', 'status', 'featured', 'id', 'price'],
  spreadsheet: { columns: ['title', 'status', 'featured', 'price'], maxChanges: 1000 },
} as unknown as TableSchema

const records: TableRecordSchema[] = [1, 2, 3].map((key) => ({
  key,
  cells: {
    title: { state: `Post ${key}` },
    status: { state: 'draft' },
    featured: { state: key === 2 },
    id: { state: key },
    price: { state: key * 10, disabled: key === 3 },
  },
}))

function grid(): SpreadsheetGrid {
  const columns = spreadsheetColumns(table)

  return new SpreadsheetGrid(spreadsheetRows(records, columns), columns)
}

describe('TSV', () => {
  it('parses tabs, newlines, quoted cells and doubled quotes', () => {
    expect(parseTsv('a\tb\r\nc\td\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
    expect(parseTsv('"x\ty"\t"line 1\nline 2"\t"say ""hi"""')).toEqual([
      ['x\ty', 'line 1\nline 2', 'say "hi"'],
    ])
    expect(parseTsv('a\t\tc')).toEqual([['a', '', 'c']])
    expect(parseTsv('')).toEqual([])
    // A quote inside an unquoted cell is literal.
    expect(parseTsv('5" screen')).toEqual([['5" screen']])
  })

  it('writes TSV that parses back to the same cells', () => {
    const rows = [
      ['plain', 'with\ttab'],
      ['multi\nline', 'say "hi"'],
    ]

    expect(toTsv(rows)).toBe('plain\t"with\ttab"\n"multi\nline"\t"say ""hi"""')
    expect(parseTsv(toTsv(rows))).toEqual(rows)
  })
})

describe('coercion', () => {
  const columns = spreadsheetColumns(table)
  const [, status, featured, , price] = columns as [
    SpreadsheetColumn,
    SpreadsheetColumn,
    SpreadsheetColumn,
    SpreadsheetColumn,
    SpreadsheetColumn,
  ]

  it('maps select labels and values, booleans and numbers', () => {
    expect(coerceSpreadsheetValue(status, 'published')).toEqual({ value: 'published' })
    expect(coerceSpreadsheetValue(status, ' published ')).toEqual({ value: 'published' })
    expect(coerceSpreadsheetValue(status, 'PUBLISHED')).toEqual({ value: 'published' })
    expect(coerceSpreadsheetValue(status, 'Draft')).toEqual({ value: 'draft' })
    expect(coerceSpreadsheetValue(status, 'nope')).toEqual({ error: 'option' })
    expect(coerceSpreadsheetValue(featured, 'TRUE')).toEqual({ value: true })
    expect(coerceSpreadsheetValue(featured, 'no')).toEqual({ value: false })
    expect(coerceSpreadsheetValue(featured, 'maybe')).toEqual({ error: 'boolean' })
    expect(coerceSpreadsheetValue(price, '12.5')).toEqual({ value: '12.5' })
    expect(coerceSpreadsheetValue(price, '')).toEqual({ value: null })
    expect(coerceSpreadsheetValue(price, '12,5')).toEqual({ error: 'number' })
  })
})

describe('SpreadsheetGrid', () => {
  it('lists every visible column, editable as the server says', () => {
    const columns = spreadsheetColumns(table)

    expect(columns.map((column) => [column.name, column.kind, column.editable])).toEqual([
      ['title', 'text', true],
      ['status', 'select', true],
      ['featured', 'boolean', true],
      ['id', 'text', false],
      ['price', 'number', true],
    ])
    expect(columns[1]?.options?.map((option) => option.value)).toEqual(['draft', 'published'])
  })

  it('moves with arrow keys, mirrored in RTL, and clamps at the edges', () => {
    const sheet = grid()

    expect(sheet.handleKey({ key: 'ArrowRight' })).toBe('moved')
    expect(sheet.state.active).toEqual({ row: 0, col: 1 })

    sheet.handleKey({ key: 'ArrowLeft' }, 'rtl')
    expect(sheet.state.active).toEqual({ row: 0, col: 2 })

    sheet.handleKey({ key: 'ArrowUp' })
    expect(sheet.state.active).toEqual({ row: 0, col: 2 })

    sheet.handleKey({ key: 'End', ctrlKey: true })
    expect(sheet.state.active).toEqual({ row: 2, col: 4 })

    sheet.handleKey({ key: 'Home' })
    expect(sheet.state.active).toEqual({ row: 2, col: 0 })

    // Tab moves to the next column in either direction of reading.
    sheet.handleKey({ key: 'Tab' }, 'rtl')
    expect(sheet.state.active).toEqual({ row: 2, col: 1 })

    sheet.handleKey({ key: 'ArrowDown', shiftKey: true })
    sheet.handleKey({ key: 'ArrowUp', shiftKey: true })
    sheet.handleKey({ key: 'ArrowUp', shiftKey: true })
    expect(sheet.bounds()).toEqual({ top: 0, bottom: 2, left: 1, right: 1 })
  })

  it('edits with Enter, replaces on typing, cancels with Escape and commits with Tab', () => {
    const sheet = grid()

    expect(sheet.handleKey({ key: 'Enter' })).toBe('edit')
    expect(sheet.state.editing?.value).toBe('Post 1')

    sheet.updateDraft('Changed')
    expect(sheet.handleKey({ key: 'Escape' })).toBe('cancel')
    expect(sheet.value(0, 0)).toBe('Post 1')

    expect(sheet.handleKey({ key: 'N' })).toBe('edit')
    expect(sheet.state.editing?.value).toBe('N')

    sheet.updateDraft('New title')
    expect(sheet.handleKey({ key: 'Tab' })).toBe('commit')
    expect(sheet.value(0, 0)).toBe('New title')
    expect(sheet.isDirty(0, 0)).toBe(true)
    expect(sheet.state.active).toEqual({ row: 0, col: 1 })

    // Read-only and disabled cells don't edit.
    sheet.moveTo(0, 3)
    expect(sheet.handleKey({ key: 'Enter' })).toBe('ignored')
    sheet.moveTo(2, 4)
    expect(sheet.handleKey({ key: 'x' })).toBe('ignored')
  })

  it('toggles booleans with Space and Enter, and clears with Delete', () => {
    const sheet = grid()

    sheet.moveTo(0, 2)
    expect(sheet.handleKey({ key: ' ' })).toBe('toggle')
    expect(sheet.value(0, 2)).toBe(true)

    // Back to the original value: no longer dirty.
    sheet.handleKey({ key: 'Enter' })
    expect(sheet.isDirty(0, 2)).toBe(false)

    sheet.moveTo(0, 0)
    expect(sheet.handleKey({ key: 'Delete' })).toBe('clear')
    expect(sheet.value(0, 0)).toBeNull()
  })

  it('fills down the selection, or the cell above into one cell', () => {
    const sheet = grid()

    sheet.moveTo(0, 0)
    sheet.moveTo(2, 1, true)
    expect(sheet.handleKey({ key: 'd', metaKey: true })).toBe('fill')
    expect([sheet.value(1, 0), sheet.value(2, 0)]).toEqual(['Post 1', 'Post 1'])

    const single = grid()
    single.moveTo(1, 4)
    expect(single.fillDown()).toBe(1)
    expect(single.value(1, 4)).toBe(10)

    // Disabled cells are skipped.
    single.moveTo(2, 4)
    expect(single.fillDown()).toBe(0)
  })

  it('undoes the last batch', () => {
    const sheet = grid()

    sheet.moveTo(0, 0)
    sheet.moveTo(2, 0, true)
    sheet.clearSelection()
    sheet.moveTo(0, 2)
    sheet.handleKey({ key: ' ' })

    expect(sheet.dirtyCount).toBe(4)
    expect(sheet.handleKey({ key: 'z', ctrlKey: true })).toBe('undo')

    // The renderer runs the undo the key asked for.
    sheet.undo()
    expect(sheet.dirtyCount).toBe(3)
    sheet.undo()
    expect(sheet.dirtyCount).toBe(0)
    expect(sheet.canUndo).toBe(false)
  })

  it('copies the selection as TSV, with option labels', () => {
    const sheet = grid()

    sheet.moveTo(0, 1)
    sheet.moveTo(1, 3, true)

    expect(sheet.copyText()).toBe('Draft\tFALSE\t1\nDraft\tTRUE\t2')
  })

  it('plans a paste: values coerced, invalid cells and read-only cells reported', () => {
    const sheet = grid()

    sheet.moveTo(0, 1)

    const plan = sheet.planPaste('Published\tyes\t99\nnope\t1\n"x"\tmaybe')

    expect(plan.changes).toEqual([
      { row: 0, col: 1, value: 'published', text: 'Published' },
      { row: 0, col: 2, value: true, text: 'yes' },
    ])
    expect(plan.issues).toEqual([
      { row: 1, col: 1, text: 'nope', reason: 'option' },
      { row: 2, col: 1, text: 'x', reason: 'option' },
      { row: 2, col: 2, text: 'maybe', reason: 'boolean' },
    ])
    // The id column is read-only; row 1's "1" equals the current value.
    expect(plan.skipped).toBe(1)
    expect(plan.rows).toBe(3)

    expect(sheet.apply(plan.changes)).toBe(2)
    expect(sheet.changes()).toEqual([
      { record: 1, column: 'status', state: 'published' },
      { record: 1, column: 'featured', state: true },
    ])
  })

  it('fills a selected range with one copied cell', () => {
    const sheet = grid()

    sheet.moveTo(0, 0)
    sheet.moveTo(1, 0, true)

    expect(sheet.planPaste('Same').changes.map((change) => change.value)).toEqual(['Same', 'Same'])
  })

  it('keeps failing cells dirty with their errors and offers to undo the save', () => {
    const sheet = grid()

    sheet.apply([
      { row: 0, col: 0, value: 'A' },
      { row: 1, col: 0, value: '' },
    ])
    sheet.applySaveResult({
      saved: [{ record: 1, column: 'title', state: 'A', previous: 'Post 1' }],
      errors: [{ record: 2, column: 'title', messages: ['The title field is required.'] }],
    })

    expect(sheet.isDirty(0, 0)).toBe(false)
    expect(sheet.value(0, 0)).toBe('A')
    expect(sheet.isDirty(1, 0)).toBe(true)
    expect(sheet.errorsAt(1, 0)).toEqual(['The title field is required.'])
    expect(sheet.errorCount).toBe(1)
    expect(sheet.undoSaveChanges()).toEqual([
      { record: 1, column: 'title', state: 'Post 1', original: 'A' },
    ])

    // Editing the cell again clears its error.
    sheet.apply([{ row: 1, col: 0, value: 'B' }])
    expect(sheet.errorCount).toBe(0)
  })

  it('keeps edits of records still on the page after a reload', () => {
    const sheet = grid()
    const columns = spreadsheetColumns(table)

    sheet.apply([
      { row: 0, col: 0, value: 'Kept' },
      { row: 2, col: 0, value: 'Dropped' },
    ])
    sheet.setData(spreadsheetRows(records.slice(0, 2), columns), columns)

    expect(sheet.changes()).toEqual([{ record: 1, column: 'title', state: 'Kept' }])
  })
})

describe('saveSpreadsheetChanges', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('resolves a 422 with the per-cell errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              saved: [],
              errors: [{ record: 1, column: 'title', messages: ['Bad'] }],
            }),
            {
              status: 422,
              headers: { 'Content-Type': 'application/json' },
            },
          ),
      ),
    )

    const result = await saveSpreadsheetChanges('/cells', 'token', 'table', [
      { record: 1, column: 'title', state: '' },
    ])

    expect(result.errors).toHaveLength(1)
  })
})
