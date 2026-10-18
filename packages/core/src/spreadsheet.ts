import { requestJson } from './http'
import type { Option, OptionOrGroup, RecordKey } from './schema/common'
import { isOptionGroup } from './schema/common'
import type { ColumnSchema, TableRecordSchema, TableSchema } from './schema/table'
import { createStore, type Store } from './store'
import { optionText } from './table'
import { isUndoShortcut } from './undo'

/**
 * Spreadsheet mode (`Table::spreadsheet()`): the framework-agnostic grid behind each
 * renderer's lazy-loaded spreadsheet component. It keeps the active cell and selected
 * range, the in-progress edit, the dirty cells with their undo history and the server's
 * per-cell errors; it parses and writes TSV (Excel / Google Sheets clipboard) and maps
 * keys to grid commands (RTL-aware). Validation and saving stay on the server.
 */

export type SpreadsheetCellKind = 'text' | 'number' | 'select' | 'boolean'

export interface SpreadsheetColumn {
  name: string
  label: string
  kind: SpreadsheetCellKind
  editable: boolean
  /** Select columns: the flattened options. */
  options?: Option[]
  /** Text inputs: the input type (`text`, `email`, `number`, …). */
  inputType?: string
}

export interface SpreadsheetRow {
  key: RecordKey
  /** Raw values by column (what an editor edits). */
  values: Record<string, unknown>
  /** Cells that are read-only for this record (`disabled()`). */
  disabled: Record<string, boolean>
  /** What a read-only cell shows / copies. */
  display: Record<string, string>
}

export interface GridCell {
  row: number
  col: number
}

export interface GridBounds {
  top: number
  bottom: number
  left: number
  right: number
}

export interface SpreadsheetEdit {
  row: number
  col: number
  value: unknown
}

interface HistoryEntry {
  key: string
  had: boolean
  before: unknown
}

export interface SpreadsheetState {
  active: GridCell
  anchor: GridCell
  /** The cell being edited and its draft value. */
  editing: { row: number; col: number; value: unknown } | null
  /** Unsaved values by cell key. */
  edits: Record<string, unknown>
  /** Server (or paste) errors by cell key. */
  errors: Record<string, string[]>
  saving: boolean
  /** Batches that can be undone before saving, newest last. */
  history: number
}

export interface SpreadsheetChange {
  record: RecordKey
  column: string
  state: unknown
  original?: unknown
}

export interface SpreadsheetSaveResult {
  saved: Array<{ record: RecordKey; column: string; state: unknown; previous: unknown }>
  errors: Array<{ record: RecordKey; column: string; messages: string[] }>
}

export interface PastePlan {
  changes: Array<SpreadsheetEdit & { text: string }>
  /** Cells whose text can't be a value of their column (a select without that option, …). */
  issues: Array<{ row: number; col: number; text: string; reason: 'option' | 'boolean' | 'number' }>
  /** Pasted cells that fall on read-only cells or outside the grid. */
  skipped: number
  rows: number
  cols: number
}

export type SpreadsheetKeyResult =
  'ignored' | 'moved' | 'edit' | 'commit' | 'cancel' | 'toggle' | 'clear' | 'fill' | 'undo' | 'save'

export interface SpreadsheetKey {
  key: string
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
}

const PAGE_ROWS = 10

/** Cell key: record key and column name. */
export function spreadsheetCellKey(record: RecordKey, column: string): string {
  return `${String(record)}\u0000${column}`
}

function flattenOptions(options: OptionOrGroup[] | undefined): Option[] {
  return (options ?? []).flatMap((option) => (isOptionGroup(option) ? option.options : [option]))
}

/** How a column is edited in the grid. */
export function spreadsheetCellKind(column: ColumnSchema): SpreadsheetCellKind {
  switch (column.type) {
    case 'ToggleColumn':
    case 'CheckboxColumn':
      return 'boolean'
    case 'SelectColumn':
      // Options searched on the server can't be listed in a cell: they are typed.
      return (column as { optionsSearchPath?: string }).optionsSearchPath ? 'text' : 'select'
    case 'TextInputColumn':
      return (column as { inputType?: string }).inputType === 'number' ? 'number' : 'text'
    default:
      return 'text'
  }
}

/** The grid's columns: the visible ones, editable when the server lists them. */
export function spreadsheetColumns(
  table: Pick<TableSchema, 'columns' | 'visibleColumns' | 'spreadsheet'>,
): SpreadsheetColumn[] {
  const editable = new Set(table.spreadsheet?.columns ?? [])

  return table.columns
    .filter((column) => table.visibleColumns.includes(column.name))
    .map((column) => {
      const kind = spreadsheetCellKind(column)

      return {
        name: column.name,
        label: column.label,
        kind,
        editable: editable.has(column.name),
        options:
          kind === 'select'
            ? flattenOptions((column as { options?: OptionOrGroup[] }).options)
            : undefined,
        inputType: (column as { inputType?: string }).inputType,
      }
    })
}

function displayText(state: unknown): string {
  if (state === null || state === undefined) return ''
  if (Array.isArray(state)) return state.map(displayText).join(', ')
  if (typeof state === 'boolean') return state ? 'TRUE' : 'FALSE'
  if (typeof state === 'object') return ''

  return String(state as string | number)
}

/** The grid rows of the table's records. */
export function spreadsheetRows(
  records: TableRecordSchema[],
  columns: SpreadsheetColumn[],
): SpreadsheetRow[] {
  return records.map((record) => {
    const values: Record<string, unknown> = {}
    const disabled: Record<string, boolean> = {}
    const display: Record<string, string> = {}

    for (const column of columns) {
      const cell = record.cells[column.name] ?? {}
      const value = 'editState' in cell ? cell.editState : cell.state

      values[column.name] = column.kind === 'boolean' ? Boolean(value) : value
      disabled[column.name] = Boolean(cell.disabled)
      display[column.name] =
        column.kind === 'select'
          ? optionLabel(column, value)
          : displayText(column.kind === 'boolean' ? Boolean(value) : value)
    }

    return { key: record.key, values, disabled, display }
  })
}

function optionLabel(column: SpreadsheetColumn, value: unknown): string {
  if (value === null || value === undefined || value === '') return ''

  const option = column.options?.find((item) => item.value === String(value as string))

  return option ? optionText(option.label) : displayText(value)
}

/**
 * Parse tab-separated text from a spreadsheet clipboard: rows split on newlines, cells on
 * tabs, quoted cells may hold tabs, newlines and doubled quotes (`"a ""b"""`). A trailing
 * newline does not add an empty row.
 */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  let index = 0
  const input = text.replace(/\r\n?/g, '\n')

  while (index < input.length) {
    const char = input[index] as string

    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          cell += '"'
          index += 2
          continue
        }

        quoted = false
        index++
        continue
      }

      cell += char
      index++
      continue
    }

    if (char === '"' && cell === '') {
      quoted = true
    } else if (char === '\t') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }

    index++
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows
}

/** Write cells as TSV, quoting cells with tabs, newlines or quotes. */
export function toTsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => (/[\t\n\r"]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell))
        .join('\t'),
    )
    .join('\n')
}

const TRUE_VALUES = ['1', 'true', 'yes', 'y', 'on', 'x', '✓', '✔']
const FALSE_VALUES = ['0', 'false', 'no', 'n', 'off', '']

/**
 * Turn pasted (or typed) text into a value of the column: booleans from 1/0, true/false,
 * yes/no…; select values from an option's value or label; numbers from numeric text.
 * The server still validates every value with the column's rules.
 */
export function coerceSpreadsheetValue(
  column: SpreadsheetColumn,
  text: string,
): { value: unknown } | { error: 'option' | 'boolean' | 'number' } {
  const trimmed = text.trim()

  switch (column.kind) {
    case 'boolean': {
      const lower = trimmed.toLocaleLowerCase()

      if (TRUE_VALUES.includes(lower)) return { value: true }
      if (FALSE_VALUES.includes(lower)) return { value: false }

      return { error: 'boolean' }
    }
    case 'select': {
      if (trimmed === '') return { value: null }

      const options = column.options ?? []
      const byValue = options.find((option) => option.value === trimmed)
      const lower = trimmed.toLocaleLowerCase()
      const byLabel = options.find(
        (option) => optionText(option.label).toLocaleLowerCase() === lower,
      )
      const option = byValue ?? byLabel

      return option && !option.disabled ? { value: option.value } : { error: 'option' }
    }
    case 'number': {
      if (trimmed === '') return { value: null }

      return /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(trimmed)
        ? { value: trimmed }
        : { error: 'number' }
    }
    default:
      return { value: text }
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  const normalize = (value: unknown): string =>
    value === null || value === undefined
      ? ''
      : typeof value === 'boolean'
        ? value
          ? '1'
          : '0'
        : String(value as string)

  return normalize(a) === normalize(b)
}

/**
 * The grid model. Rows and columns come from the table schema (call `setData()` after
 * every reload); the edits survive reloads for records still on the page.
 */
export class SpreadsheetGrid {
  public readonly store: Store<SpreadsheetState>

  private rows: SpreadsheetRow[] = []

  private columns: SpreadsheetColumn[] = []

  private readonly undoStack: HistoryEntry[][] = []

  /** Values saved by the last save, shown until the reload brings them. */
  private saved: Record<string, unknown> = {}

  private lastSaved: SpreadsheetSaveResult['saved'] = []

  /** Cells the last `apply()` (edit, paste, fill, clear) changed. */
  public lastApplied = 0

  constructor(rows: SpreadsheetRow[] = [], columns: SpreadsheetColumn[] = []) {
    this.store = createStore<SpreadsheetState>({
      active: { row: 0, col: 0 },
      anchor: { row: 0, col: 0 },
      editing: null,
      edits: {},
      errors: {},
      saving: false,
      history: 0,
    })
    this.setData(rows, columns)
  }

  get state(): SpreadsheetState {
    return this.store.get()
  }

  get rowCount(): number {
    return this.rows.length
  }

  get columnCount(): number {
    return this.columns.length
  }

  getColumns(): SpreadsheetColumn[] {
    return this.columns
  }

  getRows(): SpreadsheetRow[] {
    return this.rows
  }

  setData(rows: SpreadsheetRow[], columns: SpreadsheetColumn[]): void {
    this.rows = rows
    this.columns = columns
    // A reload brings the saved values: they are the originals now.
    this.saved = {}

    const keys = new Set(
      rows.flatMap((row) => columns.map((column) => spreadsheetCellKey(row.key, column.name))),
    )

    this.store.set((state) => {
      const edits = Object.fromEntries(Object.entries(state.edits).filter(([key]) => keys.has(key)))
      const errors = Object.fromEntries(
        Object.entries(state.errors).filter(([key]) => keys.has(key)),
      )

      return {
        ...state,
        active: this.clamp(state.active),
        anchor: this.clamp(state.anchor),
        editing: null,
        edits,
        errors,
      }
    })
  }

  private clamp(cell: GridCell): GridCell {
    return {
      row: Math.max(0, Math.min(this.rows.length - 1, cell.row)),
      col: Math.max(0, Math.min(this.columns.length - 1, cell.col)),
    }
  }

  private keyAt(row: number, col: number): string | null {
    const record = this.rows[row]
    const column = this.columns[col]

    return record && column ? spreadsheetCellKey(record.key, column.name) : null
  }

  /** The value a cell shows: the unsaved edit, else the value saved last, else the original. */
  value(row: number, col: number): unknown {
    const key = this.keyAt(row, col)
    const record = this.rows[row]
    const column = this.columns[col]

    if (key === null || !record || !column) return undefined
    if (key in this.state.edits) return this.state.edits[key]
    if (key in this.saved) return this.saved[key]

    return record.values[column.name]
  }

  /** What a cell shows as text (copy, read-only cells, select labels). */
  text(row: number, col: number): string {
    const column = this.columns[col]
    const record = this.rows[row]
    const key = this.keyAt(row, col)

    if (!column || !record || key === null) return ''

    if (!(key in this.state.edits) && !(key in this.saved) && !column.editable) {
      return record.display[column.name] ?? ''
    }

    const value = this.value(row, col)

    return column.kind === 'select' ? optionLabel(column, value) : displayText(value)
  }

  isEditable(row: number, col: number): boolean {
    const column = this.columns[col]
    const record = this.rows[row]

    return Boolean(column?.editable && record && !record.disabled[column.name])
  }

  isDirty(row: number, col: number): boolean {
    const key = this.keyAt(row, col)

    return key !== null && key in this.state.edits
  }

  errorsAt(row: number, col: number): string[] {
    const key = this.keyAt(row, col)

    return key === null ? [] : (this.state.errors[key] ?? [])
  }

  /** Grid position of a record's cell, or null when it is not on the page. */
  position(record: RecordKey, column: string): GridCell | null {
    const row = this.rows.findIndex((item) => String(item.key) === String(record))
    const col = this.columns.findIndex((item) => item.name === column)

    return row === -1 || col === -1 ? null : { row, col }
  }

  /** The cells with errors, in grid order, for an error summary. */
  errorCells(): Array<GridCell & { key: string; messages: string[] }> {
    const cells: Array<GridCell & { key: string; messages: string[] }> = []

    this.rows.forEach((record, row) => {
      this.columns.forEach((column, col) => {
        const key = spreadsheetCellKey(record.key, column.name)
        const messages = this.state.errors[key]

        if (messages) cells.push({ key, row, col, messages })
      })
    })

    return cells
  }

  get dirtyCount(): number {
    return Object.keys(this.state.edits).length
  }

  get errorCount(): number {
    return Object.keys(this.state.errors).length
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /** Whether the last save can be reverted. */
  get canUndoSave(): boolean {
    return this.lastSaved.length > 0
  }

  bounds(): GridBounds {
    const { active, anchor } = this.state

    return {
      top: Math.min(active.row, anchor.row),
      bottom: Math.max(active.row, anchor.row),
      left: Math.min(active.col, anchor.col),
      right: Math.max(active.col, anchor.col),
    }
  }

  isSelected(row: number, col: number): boolean {
    const bounds = this.bounds()

    return row >= bounds.top && row <= bounds.bottom && col >= bounds.left && col <= bounds.right
  }

  isActive(row: number, col: number): boolean {
    return this.state.active.row === row && this.state.active.col === col
  }

  moveTo(row: number, col: number, extend = false): void {
    const active = this.clamp({ row, col })

    this.store.update({ active, anchor: extend ? this.state.anchor : active })
  }

  move(rows: number, cols: number, extend = false): void {
    this.moveTo(this.state.active.row + rows, this.state.active.col + cols, extend)
  }

  /** Start editing the active cell, optionally replacing its value with typed text. */
  beginEdit(initial?: string): boolean {
    const { row, col } = this.state.active

    if (!this.isEditable(row, col)) return false

    const column = this.columns[col] as SpreadsheetColumn
    const value =
      initial !== undefined && column.kind !== 'boolean' && column.kind !== 'select'
        ? initial
        : this.value(row, col)

    this.store.update({ editing: { row, col, value: value ?? '' } })

    return true
  }

  updateDraft(value: unknown): void {
    const editing = this.state.editing

    if (editing) this.store.update({ editing: { ...editing, value } })
  }

  cancelEdit(): void {
    this.store.update({ editing: null })
  }

  /** Keep the draft as the cell's value (one undo step). */
  commitEdit(): boolean {
    const editing = this.state.editing

    if (!editing) return false

    this.store.update({ editing: null })

    const column = this.columns[editing.col]
    let value = editing.value

    if (column?.kind === 'number' && (value === '' || value === undefined)) value = null
    if (column?.kind === 'select' && value === '') value = null

    return this.apply([{ row: editing.row, col: editing.col, value }]) > 0
  }

  /**
   * Set cells (one undo step). Read-only cells are skipped, as are values equal to the
   * current one; a value equal to the original drops the cell's edit. Returns the number
   * of cells changed.
   */
  apply(changes: SpreadsheetEdit[]): number {
    const edits = { ...this.state.edits }
    const errors = { ...this.state.errors }
    const history: HistoryEntry[] = []

    for (const change of changes) {
      const key = this.keyAt(change.row, change.col)

      if (key === null || !this.isEditable(change.row, change.col)) continue
      if (sameValue(this.value(change.row, change.col), change.value)) continue

      const record = this.rows[change.row] as SpreadsheetRow
      const column = this.columns[change.col] as SpreadsheetColumn

      history.push({ key, had: key in edits, before: edits[key] })
      delete errors[key]

      const original = key in this.saved ? this.saved[key] : record.values[column.name]

      if (sameValue(original, change.value)) {
        delete edits[key]
      } else {
        edits[key] = change.value
      }
    }

    this.lastApplied = history.length

    if (history.length > 0) {
      this.undoStack.push(history)
      this.store.update({ edits, errors, history: this.undoStack.length })
    }

    return history.length
  }

  /** Undo the last unsaved batch (edit, paste, fill, clear). Returns the cells restored. */
  undo(): number {
    const batch = this.undoStack.pop()

    if (!batch) return 0

    const edits = { ...this.state.edits }

    for (const entry of [...batch].reverse()) {
      if (entry.had) {
        edits[entry.key] = entry.before
      } else {
        delete edits[entry.key]
      }
    }

    this.store.update({ edits, history: this.undoStack.length })

    return batch.length
  }

  /** Empty the selected editable cells. */
  clearSelection(): number {
    const bounds = this.bounds()
    const changes: SpreadsheetEdit[] = []

    for (let row = bounds.top; row <= bounds.bottom; row++) {
      for (let col = bounds.left; col <= bounds.right; col++) {
        const column = this.columns[col]

        if (column) changes.push({ row, col, value: column.kind === 'boolean' ? false : null })
      }
    }

    return this.apply(changes)
  }

  /**
   * Fill down (Ctrl/Cmd+D): the top row of the selection is copied into the rows below it;
   * with one row selected, the row above is copied into it.
   */
  fillDown(): number {
    const bounds = this.bounds()
    const source = bounds.top === bounds.bottom ? bounds.top - 1 : bounds.top
    const first = bounds.top === bounds.bottom ? bounds.top : bounds.top + 1

    if (source < 0) return 0

    const changes: SpreadsheetEdit[] = []

    for (let row = first; row <= bounds.bottom; row++) {
      for (let col = bounds.left; col <= bounds.right; col++) {
        changes.push({ row, col, value: this.value(source, col) })
      }
    }

    return this.apply(changes)
  }

  /** The selection as TSV, for the clipboard. */
  copyText(): string {
    const bounds = this.bounds()
    const rows: string[][] = []

    for (let row = bounds.top; row <= bounds.bottom; row++) {
      const cells: string[] = []

      for (let col = bounds.left; col <= bounds.right; col++) cells.push(this.text(row, col))

      rows.push(cells)
    }

    return toTsv(rows)
  }

  /**
   * What pasting `text` at the selection would change. The block starts at the
   * selection's top-left cell; one copied cell fills a whole selected range.
   */
  planPaste(text: string): PastePlan {
    let data = parseTsv(text)
    const bounds = this.bounds()

    if (data.length === 0) data = [['']]

    if (data.length === 1 && data[0]?.length === 1) {
      const single = data[0][0] as string

      data = Array.from({ length: bounds.bottom - bounds.top + 1 }, () =>
        Array.from({ length: bounds.right - bounds.left + 1 }, () => single),
      )
    }

    const plan: PastePlan = {
      changes: [],
      issues: [],
      skipped: 0,
      rows: data.length,
      cols: Math.max(...data.map((row) => row.length)),
    }

    data.forEach((cells, offset) => {
      cells.forEach((cellText, colOffset) => {
        const row = bounds.top + offset
        const col = bounds.left + colOffset
        const column = this.columns[col]

        if (!column || row >= this.rows.length || !this.isEditable(row, col)) {
          plan.skipped++

          return
        }

        const result = coerceSpreadsheetValue(column, cellText)

        if ('error' in result) {
          plan.issues.push({ row, col, text: cellText, reason: result.error })
        } else if (!sameValue(this.value(row, col), result.value)) {
          plan.changes.push({ row, col, value: result.value, text: cellText })
        }
      })
    })

    return plan
  }

  /** The unsaved changes, in the endpoint's format. */
  changes(): SpreadsheetChange[] {
    const byKey = new Map<string, { record: RecordKey; column: string }>()

    for (const row of this.rows) {
      for (const column of this.columns) {
        byKey.set(spreadsheetCellKey(row.key, column.name), {
          record: row.key,
          column: column.name,
        })
      }
    }

    return Object.entries(this.state.edits).flatMap(([key, state]) => {
      const cell = byKey.get(key)

      return cell ? [{ ...cell, state }] : []
    })
  }

  /** Show errors (e.g. from a dry run) on their cells, replacing earlier ones. */
  setErrors(errors: SpreadsheetSaveResult['errors']): void {
    const map: Record<string, string[]> = {}

    for (const error of errors) map[spreadsheetCellKey(error.record, error.column)] = error.messages

    this.store.update({ errors: map })
  }

  /**
   * Take a save result: saved cells leave the dirty set (their values show until the reload
   * brings them), failing cells keep their edit and show their messages.
   */
  applySaveResult(result: SpreadsheetSaveResult): void {
    const edits = { ...this.state.edits }

    for (const saved of result.saved) {
      const key = spreadsheetCellKey(saved.record, saved.column)

      this.saved[key] = key in edits ? edits[key] : saved.state
      delete edits[key]
    }

    if (result.saved.length > 0) {
      this.lastSaved = result.saved
      // Unsaved undo steps refer to values that are saved now.
      this.undoStack.length = 0
    }

    this.store.update({ edits, history: this.undoStack.length })
    this.setErrors(result.errors)
  }

  /**
   * The request that reverts the last save: every saved cell back to its previous value,
   * provided it still holds what was saved (else the server reports a conflict).
   */
  undoSaveChanges(): SpreadsheetChange[] {
    return this.lastSaved.map((cell) => ({
      record: cell.record,
      column: cell.column,
      state: cell.previous,
      original: cell.state,
    }))
  }

  forgetLastSave(): void {
    this.lastSaved = []
  }

  discard(): void {
    this.undoStack.length = 0
    this.store.update({ edits: {}, errors: {}, editing: null, history: 0 })
  }

  setSaving(saving: boolean): void {
    this.store.update({ saving })
  }

  /**
   * Map a key press to a grid command. Arrow keys follow the reading direction (in RTL
   * the left arrow moves to the next column), Tab / Shift+Tab move to the next / previous
   * column, Enter / F2 edit, typing replaces the value, Escape cancels, Delete clears,
   * Ctrl/Cmd+D fills down, Ctrl/Cmd+Z undoes, Ctrl/Cmd+S saves. Copy and paste go through
   * the clipboard events (`copyText()`, `planPaste()`).
   */
  handleKey(event: SpreadsheetKey, direction: 'ltr' | 'rtl' = 'ltr'): SpreadsheetKeyResult {
    const modifier = Boolean(event.ctrlKey || event.metaKey)
    const editing = this.state.editing
    const extend = Boolean(event.shiftKey)

    if (editing) {
      switch (event.key) {
        case 'Escape':
          this.cancelEdit()

          return 'cancel'
        case 'Enter':
          if (event.altKey) return 'ignored'

          this.commitEdit()
          this.move(event.shiftKey ? -1 : 1, 0)

          return 'commit'
        case 'Tab':
          this.commitEdit()
          this.move(0, event.shiftKey ? -1 : 1)

          return 'commit'
        default:
          return 'ignored'
      }
    }

    const forward = direction === 'rtl' ? -1 : 1

    if (modifier && !event.altKey) {
      const key = event.key.toLowerCase()

      if (key === 'd') return this.fillDown() > 0 ? 'fill' : 'moved'
      if (isUndoShortcut(event as KeyboardEvent)) return 'undo'
      if (key === 's') return 'save'

      if (event.key === 'Home') {
        this.moveTo(0, 0, extend)

        return 'moved'
      }

      if (event.key === 'End') {
        this.moveTo(this.rows.length - 1, this.columns.length - 1, extend)

        return 'moved'
      }

      return 'ignored'
    }

    switch (event.key) {
      case 'ArrowUp':
        this.move(-1, 0, extend)

        return 'moved'
      case 'ArrowDown':
        this.move(1, 0, extend)

        return 'moved'
      case 'ArrowLeft':
        this.move(0, -forward, extend)

        return 'moved'
      case 'ArrowRight':
        this.move(0, forward, extend)

        return 'moved'
      case 'Home':
        this.moveTo(this.state.active.row, 0, extend)

        return 'moved'
      case 'End':
        this.moveTo(this.state.active.row, this.columns.length - 1, extend)

        return 'moved'
      case 'PageUp':
        this.move(-PAGE_ROWS, 0, extend)

        return 'moved'
      case 'PageDown':
        this.move(PAGE_ROWS, 0, extend)

        return 'moved'
      case 'Tab':
        this.move(0, event.shiftKey ? -1 : 1)

        return 'moved'
      case 'Enter':
      case 'F2':
        return this.toggleOrEdit()
      case ' ':
        return this.isBooleanActive()
          ? this.toggleOrEdit()
          : this.beginEdit(' ')
            ? 'edit'
            : 'ignored'
      case 'Escape':
        this.moveTo(this.state.active.row, this.state.active.col)

        return 'cancel'
      case 'Delete':
      case 'Backspace':
        return this.clearSelection() > 0 ? 'clear' : 'moved'
      default:
        // Typing a character replaces the value (type-to-replace).
        if (event.key.length === 1 && !event.altKey && !this.isBooleanActive()) {
          return this.beginEdit(event.key) ? 'edit' : 'ignored'
        }

        return 'ignored'
    }
  }

  private isBooleanActive(): boolean {
    return this.columns[this.state.active.col]?.kind === 'boolean'
  }

  private toggleOrEdit(): SpreadsheetKeyResult {
    const { row, col } = this.state.active

    if (!this.isEditable(row, col)) return 'ignored'

    if (this.isBooleanActive()) {
      this.apply([{ row, col, value: !this.value(row, col) }])

      return 'toggle'
    }

    return this.beginEdit() ? 'edit' : 'ignored'
  }
}

/**
 * Save (or, with `dryRun`, only validate) grid changes in one request. A 422 still carries
 * the per-cell errors, so it resolves with them instead of throwing.
 */
export async function saveSpreadsheetChanges(
  endpoint: string,
  token: string,
  component: string,
  changes: SpreadsheetChange[],
  options: { dryRun?: boolean } = {},
): Promise<SpreadsheetSaveResult> {
  try {
    return await requestJson<SpreadsheetSaveResult>(endpoint, {
      method: 'POST',
      body: {
        token,
        component,
        tableQuery: typeof window !== 'undefined' ? window.location.search : '',
        changes,
        dryRun: options.dryRun || undefined,
      },
    })
  } catch (error) {
    const data = (error as { status?: number; data?: Partial<SpreadsheetSaveResult> }).data

    if ((error as { status?: number }).status === 422 && data && Array.isArray(data.errors)) {
      return { saved: data.saved ?? [], errors: data.errors }
    }

    throw error
  }
}

/** ARIA position of a grid cell (1-based; the header row is row 1). */
export function spreadsheetAria(
  row: number,
  col: number,
): { 'aria-rowindex': number; 'aria-colindex': number } {
  return { 'aria-rowindex': row + 2, 'aria-colindex': col + 1 }
}

/** DOM id of a grid cell (for `aria-activedescendant` and focus). */
export function spreadsheetCellId(base: string, row: number, col: number): string {
  return `${base}-r${row}-c${col}`
}

/** Classes of the grid's parts, shared by the renderers (restyle through the data-slots). */
export const SPREADSHEET_CLASSES = {
  root: 'bg-card relative overflow-auto rounded-xl border shadow-xs',
  table: 'w-full border-collapse text-sm',
  header:
    'bg-muted/50 text-muted-foreground sticky top-0 z-[1] h-9 border-b border-e px-2 text-start text-xs font-medium whitespace-nowrap last:border-e-0',
  rowHeader:
    'bg-muted/30 text-muted-foreground w-0 border-e border-b px-2 text-end text-xs tabular-nums',
  cell: 'relative h-9 max-w-80 min-w-24 cursor-cell truncate border-e border-b px-2 align-middle outline-none last:border-e-0',
  readonly: 'text-muted-foreground bg-muted/20 cursor-default',
  selected: 'bg-primary/10',
  active: 'outline-ring z-[1] outline-2 -outline-offset-2',
  dirty: 'bg-amber-500/10',
  error: 'ring-destructive ring-1 ring-inset',
  editor:
    'bg-background absolute inset-0 h-full w-full border-0 px-2 text-sm outline-2 -outline-offset-2 outline-ring',
} as const

/** The classes of one cell for its state. */
export function spreadsheetCellClass(grid: SpreadsheetGrid, row: number, col: number): string {
  return [
    SPREADSHEET_CLASSES.cell,
    grid.isEditable(row, col) ? '' : SPREADSHEET_CLASSES.readonly,
    grid.isSelected(row, col) ? SPREADSHEET_CLASSES.selected : '',
    grid.isDirty(row, col) && !grid.isSelected(row, col) ? SPREADSHEET_CLASSES.dirty : '',
    grid.errorsAt(row, col).length > 0 ? SPREADSHEET_CLASSES.error : '',
    grid.isActive(row, col) ? SPREADSHEET_CLASSES.active : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/** A message for the grid's live region: a translation key, its English text and count. */
export interface SpreadsheetAnnouncement {
  key: string
  fallback: string
  count: number
}

/** What to announce after a key command changed cells (null: nothing). */
export function spreadsheetAnnouncement(
  result: SpreadsheetKeyResult | 'copy' | 'paste' | 'saved' | 'failed',
  count: number,
): SpreadsheetAnnouncement | null {
  switch (result) {
    case 'fill':
      return {
        key: 'table.spreadsheet.filled',
        fallback: ':count cell filled|:count cells filled',
        count,
      }
    case 'clear':
      return {
        key: 'table.spreadsheet.cleared',
        fallback: ':count cell cleared|:count cells cleared',
        count,
      }
    case 'undo':
      return {
        key: 'table.spreadsheet.undone',
        fallback: ':count change undone|:count changes undone',
        count,
      }
    case 'copy':
      return {
        key: 'table.spreadsheet.copied',
        fallback: ':count cell copied|:count cells copied',
        count,
      }
    case 'paste':
      return {
        key: 'table.spreadsheet.pasted',
        fallback: ':count cell pasted|:count cells pasted',
        count,
      }
    case 'saved':
      return {
        key: 'table.spreadsheet.saved',
        fallback: ':count cell saved|:count cells saved',
        count,
      }
    case 'failed':
      return {
        key: 'table.spreadsheet.save_failed',
        fallback: ":count cell couldn't be saved|:count cells couldn't be saved",
        count,
      }
    default:
      return null
  }
}

/** The number of cells a selection covers. */
export function spreadsheetSelectionSize(bounds: GridBounds): number {
  return (bounds.bottom - bounds.top + 1) * (bounds.right - bounds.left + 1)
}

/** The keys of a paste issue's message (`option`, `boolean`, `number`). */
export const SPREADSHEET_ISSUE_MESSAGES: Record<
  PastePlan['issues'][number]['reason'],
  { key: string; fallback: string }
> = {
  option: {
    key: 'table.spreadsheet.invalid_option',
    fallback: '":text" is not an option of :column (row :row)',
  },
  boolean: {
    key: 'table.spreadsheet.invalid_boolean',
    fallback: '":text" is not yes or no for :column (row :row)',
  },
  number: {
    key: 'table.spreadsheet.invalid_number',
    fallback: '":text" is not a number for :column (row :row)',
  },
}
