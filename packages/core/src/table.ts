import type { VisitOptions } from '@inertiajs/core'
import { inertiaReload, inertiaVisit, requestJson } from './http'
import { currentPageQuery } from './page-query'
import type { AnyActionSchema } from './schema/actions'
import type { Option, RecordKey } from './schema/common'
import type {
  ColumnSchema,
  FiltersFormWidth,
  SelectColumnSchema,
  TableRecordSchema,
  TableSchema,
} from './schema/table'
import { createStore, type Store } from './store'
import { beginTableLoading, endTableLoading } from './table-toolbar'

export interface TableQuery {
  sort?: string | null
  direction?: 'asc' | 'desc' | null
  search?: string | null
  filters?: Record<string, Record<string, unknown>> | null
  columnSearch?: Record<string, string> | null
  page?: number | null
  /** Opaque cursor of a cursor-paginated table. */
  cursor?: string | null
  perPage?: number | 'all' | null
  columns?: string[] | null
  /** Group id; `''` turns a default group off, `null` returns to the default. */
  group?: string | null
  groupDirection?: 'asc' | 'desc' | null
  /** Reorder mode of a `reorderable()` table; the server lists every record while it is on. */
  reordering?: boolean | null
}

/**
 * Query-string keys of each table (by identifier, `''` for none) that the server keeps
 * in the session. Cleared values of these keys are sent as empty keys (`?search=`) so the
 * server stores them instead of restoring the previous value.
 */
const persistedTableState = new Map<string, readonly string[]>()

/** Register a table's persisted keys (from `TableSchema.persistedState`); returns a cleanup. */
export function registerTablePersistence(
  identifier: string | undefined,
  keys: readonly string[] | undefined,
): () => void {
  const id = identifier ?? ''

  if (!keys || keys.length === 0) {
    persistedTableState.delete(id)

    return () => {}
  }

  persistedTableState.set(id, keys)

  return () => {
    if (persistedTableState.get(id) === keys) persistedTableState.delete(id)
  }
}

/**
 * Append a nested value as PHP-style bracket parameters (`key[a][0][b]=1`). Empty values
 * (`null`, `''`, `false`) are skipped; `true` becomes `1`. Returns whether anything was set.
 */
function appendNested(params: URLSearchParams, key: string, value: unknown): boolean {
  if (value === null || value === undefined || value === '' || value === false) {
    return false
  }

  if (Array.isArray(value)) {
    let appended = false
    value.forEach((item, index) => {
      appended = appendNested(params, `${key}[${index}]`, item) || appended
    })

    return appended
  }

  if (typeof value === 'object') {
    let appended = false

    for (const [name, item] of Object.entries(value as Record<string, unknown>)) {
      appended = appendNested(params, `${key}[${name}]`, item) || appended
    }

    return appended
  }

  params.set(key, typeof value === 'boolean' ? '1' : String(value as string | number))

  return true
}

/** Query-string key for a table parameter, honouring the identifier prefix. */
export function tableQueryKey(identifier: string | undefined, name: string): string {
  return identifier ? `${identifier}_${name}` : name
}

/**
 * Build the URL for a table state change by merging into the current location's query.
 * Only the keys present in `changes` are touched; `null` removes a key.
 */
export function buildTableUrl(
  currentUrl: string,
  identifier: string | undefined,
  changes: TableQuery,
  persisted: readonly string[] = persistedTableState.get(identifier ?? '') ?? [],
): string {
  const url = new URL(
    currentUrl,
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
  )
  const params = url.searchParams

  const removePrefix = (prefix: string) => {
    for (const key of [...params.keys()]) {
      if (key === prefix || key.startsWith(`${prefix}[`)) {
        params.delete(key)
      }
    }
  }

  const setScalar = (name: string, value: string | number | null | undefined) => {
    const key = tableQueryKey(identifier, name)

    if (value === null || value === undefined || value === '') {
      // A persisted key is cleared explicitly, or the server would restore it.
      if (persisted.includes(name)) {
        params.set(key, '')
      } else {
        params.delete(key)
      }
    } else {
      params.set(key, String(value))
    }
  }

  if ('sort' in changes) setScalar('sort', changes.sort)
  if ('direction' in changes) setScalar('direction', changes.direction)
  if ('search' in changes) setScalar('search', changes.search)
  if ('perPage' in changes) setScalar('perPage', changes.perPage)
  if ('page' in changes) setScalar('page', changes.page && changes.page > 1 ? changes.page : null)
  if ('cursor' in changes) setScalar('cursor', changes.cursor)
  if ('groupDirection' in changes) setScalar('groupDirection', changes.groupDirection)
  if ('reordering' in changes) setScalar('reordering', changes.reordering ? 1 : null)

  if ('group' in changes) {
    const key = tableQueryKey(identifier, 'group')

    if (changes.group === null || changes.group === undefined) {
      params.delete(key)
    } else {
      params.set(key, changes.group)
    }
  }

  if ('filters' in changes) {
    const key = tableQueryKey(identifier, 'filters')
    removePrefix(key)

    // Filter state may nest (the query builder's rule tree).
    const appended = appendNested(params, key, changes.filters ?? {})

    if (!appended && persisted.includes('filters')) {
      params.set(key, '')
    }
  }

  if ('columnSearch' in changes) {
    const key = tableQueryKey(identifier, 'columnSearch')
    removePrefix(key)

    let appended = false

    for (const [column, value] of Object.entries(changes.columnSearch ?? {})) {
      if (value) {
        params.set(`${key}[${column}]`, value)
        appended = true
      }
    }

    if (!appended && persisted.includes('columnSearch')) {
      params.set(key, '')
    }
  }

  if ('columns' in changes) {
    const key = tableQueryKey(identifier, 'columns')
    removePrefix(key)

    changes.columns?.forEach((column, index) => params.set(`${key}[${index}]`, column))

    // Every toggleable column hidden: an empty key, or the server restores the stored set.
    if (!changes.columns?.length && persisted.includes('columns')) {
      params.set(key, '')
    }
  }

  // Any change other than paging resets to the first page.
  if (!('page' in changes) && !('cursor' in changes) && Object.keys(changes).length > 0) {
    params.delete(tableQueryKey(identifier, 'page'))
    params.delete(tableQueryKey(identifier, 'cursor'))
  }

  return url.pathname + (params.toString() ? `?${params.toString()}` : '') + url.hash
}

/** Visit lifecycle callbacks a table state change may observe (load more, retry). */
export type TableVisitCallbacks = Pick<
  VisitOptions,
  'onSuccess' | 'onError' | 'onFinish' | 'onCancel'
>

/** Navigate (Inertia visit, preserving state/scroll) to a new table state. */
export function visitTable(
  identifier: string | undefined,
  changes: TableQuery,
  only?: string[],
  callbacks: TableVisitCallbacks = {},
): void {
  const url = buildTableUrl(
    typeof window !== 'undefined' ? window.location.href : '/',
    identifier,
    changes,
  )

  // `loadingSkeleton()`: the table knows a reload of its records is in flight.
  beginTableLoading(identifier)

  inertiaVisit(url, {
    preserveState: true,
    preserveScroll: true,
    replace: true,
    only,
    ...callbacks,
    onFinish: (visit) => {
      endTableLoading(identifier)
      callbacks.onFinish?.(visit)
    },
  })
}

export interface SelectionState {
  /** Selected record keys, always stored as strings. */
  selected: Set<string>
  /** True when "select all N records" (beyond the current page) is active. */
  allSelected: boolean
  /** Group of the selected records under `selectGroupsOnly()`. */
  group?: string
}

export interface SelectionLimits {
  /** `maxSelectableRecords()`: further records can't be selected. */
  max?: number | null
  /** `selectGroupsOnly()`: selecting a record of another group starts a new selection. */
  groupsOnly?: boolean
}

/**
 * Record selection for bulk actions. Keys are compared as strings.
 */
export class TableSelection {
  public readonly store: Store<SelectionState>

  private scope: string | undefined

  private limits: SelectionLimits = {}

  constructor() {
    this.store = createStore<SelectionState>({ selected: new Set(), allSelected: false })
  }

  /** Apply the table's selection limits (call with every new table schema). */
  configure(table: Pick<TableSchema, 'maxSelectableRecords' | 'selectGroupsOnly'>): void {
    this.limits = {
      max: table.maxSelectableRecords ?? null,
      groupsOnly: Boolean(table.selectGroupsOnly),
    }
  }

  /** Whether `maxSelectableRecords()` is reached. */
  get isFull(): boolean {
    const max = this.limits.max

    return typeof max === 'number' && this.state.selected.size >= max
  }

  /** Whether the record's checkbox can be ticked now (always true for selected rows). */
  canSelect(key: RecordKey): boolean {
    return this.isSelected(key) || !this.isFull
  }

  /**
   * Follow the table's `selectionScope`: when the filters, search or tab change the
   * selection is cleared, so a bulk action never hits records that are no longer listed.
   * Call it with every new table schema; an absent scope keeps the selection.
   */
  syncScope(scope: string | null | undefined): void {
    const next = scope ?? undefined
    const changed = next !== undefined && this.scope !== undefined && next !== this.scope

    this.scope = next

    if (changed && (this.state.selected.size > 0 || this.state.allSelected)) {
      this.clear()
    }
  }

  get state(): SelectionState {
    return this.store.get()
  }

  isSelected(key: RecordKey): boolean {
    return this.state.allSelected || this.state.selected.has(String(key))
  }

  /**
   * Select or deselect a record. `group` is the record's group (`record.group`): under
   * `selectGroupsOnly()` a record of another group replaces the selection.
   */
  toggle(key: RecordKey, force?: boolean, group?: string): void {
    this.store.set((state) => {
      const id = String(key)
      const shouldSelect = force ?? !state.selected.has(id)
      const otherGroup =
        shouldSelect && this.limits.groupsOnly && state.selected.size > 0 && state.group !== group
      const selected = otherGroup ? new Set<string>() : new Set(state.selected)

      if (shouldSelect) {
        const max = this.limits.max

        if (typeof max === 'number' && !selected.has(id) && selected.size >= max) {
          return state
        }

        selected.add(id)
      } else {
        selected.delete(id)
      }

      return {
        selected,
        allSelected: false,
        group:
          this.limits.groupsOnly && selected.size > 0
            ? shouldSelect
              ? group
              : state.group
            : undefined,
      }
    })
  }

  /** Select the page's selectable records, up to `maxSelectableRecords()`. */
  selectPage(records: TableRecordSchema[]): void {
    this.store.set((state) => {
      const selected = new Set(state.selected)
      const max = this.limits.max

      for (const record of records) {
        if (typeof max === 'number' && selected.size >= max) break

        if (record.selectable !== false) {
          selected.add(String(record.key))
        }
      }

      return { selected, allSelected: false, group: state.group }
    })
  }

  /**
   * Select every selectable record of one group on the page (`selectGroupsOnly()`), in place
   * of the current selection when it holds another group.
   */
  selectGroup(group: string, records: TableRecordSchema[]): void {
    this.store.set((state) => {
      const selected = state.group === group ? new Set(state.selected) : new Set<string>()
      const max = this.limits.max

      for (const record of records) {
        if (typeof max === 'number' && selected.size >= max) break

        if (record.selectable !== false && (record.group ?? '') === group) {
          selected.add(String(record.key))
        }
      }

      return { selected, allSelected: false, group: selected.size > 0 ? group : undefined }
    })
  }

  deselectGroup(group: string, records: TableRecordSchema[]): void {
    this.store.set((state) => {
      const selected = new Set(state.selected)

      for (const record of records) {
        if ((record.group ?? '') === group) selected.delete(String(record.key))
      }

      return { selected, allSelected: false, group: selected.size > 0 ? state.group : undefined }
    })
  }

  /** Checkbox state of a group heading: all, some or none of its selectable records. */
  groupState(group: string, records: TableRecordSchema[]): boolean | 'indeterminate' {
    const members = records.filter(
      (record) => record.selectable !== false && (record.group ?? '') === group,
    )
    const count = members.filter((record) => this.isSelected(record.key)).length

    if (count === 0 || members.length === 0) return false

    return count === members.length ? true : 'indeterminate'
  }

  deselectPage(records: TableRecordSchema[]): void {
    this.store.set((state) => {
      const selected = new Set(state.selected)

      for (const record of records) {
        selected.delete(String(record.key))
      }

      return { selected, allSelected: false, group: selected.size > 0 ? state.group : undefined }
    })
  }

  /** "Select all N records"; ignored under `maxSelectableRecords()` / `selectGroupsOnly()`. */
  selectAll(): void {
    if (typeof this.limits.max === 'number' || this.limits.groupsOnly) return

    this.store.set({ selected: new Set(), allSelected: true })
  }

  clear(): void {
    this.store.set({ selected: new Set(), allSelected: false })
  }

  get count(): number {
    return this.state.selected.size
  }

  get keys(): string[] {
    return [...this.state.selected]
  }
}

export function isPageFullySelected(
  selection: TableSelection,
  records: TableRecordSchema[],
): boolean {
  const selectable = records.filter((record) => record.selectable !== false)

  return selectable.length > 0 && selectable.every((record) => selection.isSelected(record.key))
}

export interface TableEndpoints {
  cell: string
  reorder: string
}

/** Persist an inline cell edit, then reload page props. */
export async function updateTableCell(
  endpoints: TableEndpoints,
  token: string,
  component: string,
  record: RecordKey,
  column: string,
  state: unknown,
): Promise<unknown> {
  const response = await requestJson<{ state: unknown }>(endpoints.cell, {
    method: 'POST',
    // The page's tab, filters and view: the record is looked up in the table as shown.
    body: { token, component, record, column, state, tableQuery: currentPageQuery() },
  })

  return response.state
}

export async function reorderTable(
  endpoints: TableEndpoints,
  token: string,
  component: string,
  order: RecordKey[],
  options: { reload?: boolean } = {},
): Promise<void> {
  await requestJson(endpoints.reorder, {
    method: 'POST',
    body: { token, component, order, tableQuery: currentPageQuery() },
  })

  if (options.reload ?? true) inertiaReload()
}

/**
 * Whether entering reorder mode reloads the table with `?reordering=1`: a paginated table
 * lists every record while reordering (so records can move between pages), unless it has
 * `paginatedWhileReordering()`.
 */
export function reorderingListsAllRecords(
  table: Pick<TableSchema, 'pagination' | 'paginatedWhileReordering'>,
): boolean {
  return Boolean(table.pagination) && !table.paginatedWhileReordering
}

/** Enter reorder mode: reloads the table without pages when `reorderingListsAllRecords()`. */
export function startTableReordering(
  table: Pick<TableSchema, 'identifier' | 'pagination' | 'paginatedWhileReordering'>,
): void {
  if (reorderingListsAllRecords(table)) {
    visitTable(table.identifier, { reordering: true, page: null, cursor: null }, ['page'])
  }
}

/** Leave reorder mode: a table the server lists in reorder mode reloads with its pages. */
export function stopTableReordering(table: Pick<TableSchema, 'identifier' | 'reordering'>): void {
  if (table.reordering) {
    visitTable(table.identifier, { reordering: null, page: null }, ['page'])
  }
}

export function visibleColumns(table: TableSchema): TableSchema['columns'] {
  return table.columns.filter((column) => table.visibleColumns.includes(column.name))
}

/**
 * Whether the bulk bar offers "select all N records": not under `selectCurrentPageOnly()`,
 * `maxSelectableRecords()` or `selectGroupsOnly()`.
 */
export function canSelectAllRecords(
  table: Pick<TableSchema, 'selectCurrentPageOnly' | 'maxSelectableRecords' | 'selectGroupsOnly'>,
): boolean {
  return !table.selectCurrentPageOnly && !table.maxSelectableRecords && !table.selectGroupsOnly
}

/** Reserved action arguments carrying the selection (`accessSelectedRecords()`). */
export const SELECTED_RECORDS_ARGUMENT = 'alfakitSelectedRecords'
export const ALL_SELECTED_RECORDS_ARGUMENT = 'alfakitAllSelectedRecords'

/** Whether one of the actions (or an action in a group) `accessSelectedRecords()`. */
export function actionsAccessSelectedRecords(actions: AnyActionSchema[] | undefined): boolean {
  return (actions ?? []).some((action) =>
    'actions' in action
      ? actionsAccessSelectedRecords(action.actions as AnyActionSchema[])
      : Boolean((action as { accessSelectedRecords?: boolean }).accessSelectedRecords),
  )
}

/**
 * Arguments that hand the table's selection to record actions that
 * `accessSelectedRecords()`; undefined when none of `actions` does.
 */
export function selectedRecordsArguments(
  selection: SelectionState,
  actions: AnyActionSchema[] | undefined,
): Record<string, unknown> | undefined {
  if (!actionsAccessSelectedRecords(actions)) return undefined

  return selection.allSelected
    ? { [ALL_SELECTED_RECORDS_ARGUMENT]: true }
    : { [SELECTED_RECORDS_ARGUMENT]: [...selection.selected] }
}

/**
 * Search the options of a `SelectColumn` whose options live on the server
 * (`optionsSearchPath`), through the schema options endpoint and the table's filters schema.
 */
export async function searchTableColumnOptions(
  url: string,
  token: string,
  component: string,
  column: Pick<SelectColumnSchema, 'optionsSearchPath'>,
  search: string,
): Promise<Option[]> {
  if (!column.optionsSearchPath) return []

  const response = await requestJson<{ options?: Option[] }>(url, {
    query: { token, component: `${component}.filters`, path: column.optionsSearchPath, search },
  })

  return response.options ?? []
}

/**
 * Options of a combobox `SelectColumn` matching `search` (case-insensitive, on the label's
 * text), without the record itself under `ignoreRecord`, capped at `optionsLimit`.
 */
export function filterSelectColumnOptions(
  options: Option[],
  column: Pick<SelectColumnSchema, 'optionsLimit' | 'ignoreRecord'>,
  search: string,
  recordKey?: RecordKey,
): Option[] {
  const needle = search.trim().toLocaleLowerCase()
  const matches = options.filter(
    (option) =>
      !(column.ignoreRecord && recordKey !== undefined && option.value === String(recordKey)) &&
      (needle === '' || optionText(option.label).toLocaleLowerCase().includes(needle)),
  )

  return column.optionsLimit ? matches.slice(0, column.optionsLimit) : matches
}

/**
 * What an empty combobox `SelectColumn` list says: the column's own message
 * (`loadingMessage()`, `searchingMessage()`, `noOptionsMessage()`, `noSearchResultsMessage()`)
 * or the translation key and English fallback to use instead.
 */
export function selectColumnEmptyMessage(
  column: Pick<
    SelectColumnSchema,
    'loadingMessage' | 'searchingMessage' | 'noOptionsMessage' | 'noSearchResultsMessage'
  >,
  state: { loading: boolean; search: string; optionCount: number },
): { message?: string; key: string; fallback: string } {
  if (state.loading) {
    return state.search !== ''
      ? { message: column.searchingMessage, key: 'form.searching', fallback: 'Searching…' }
      : { message: column.loadingMessage, key: 'loading', fallback: 'Loading…' }
  }

  return state.search === '' && state.optionCount === 0
    ? {
        message: column.noOptionsMessage,
        key: 'form.no_options',
        fallback: 'No options available.',
      }
    : { message: column.noSearchResultsMessage, key: 'no_results', fallback: 'No results.' }
}

/** Plain text of an option label that may be (sanitised) HTML. */
export function optionText(label: string): string {
  return label
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Text sizes of an image column / entry's "+N" (`limitedRemainingText(size:)`, default `sm`). */
export const REMAINING_TEXT_SIZE_CLASSES: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
}

/** The class of the "+N" after limited images. */
export function remainingTextSizeClass(size: string | undefined): string {
  return REMAINING_TEXT_SIZE_CLASSES[size ?? 'sm'] ?? 'text-sm'
}

/** Width classes of the filters dropdown / sidebar (`filtersFormWidth()`). */
export const FILTERS_FORM_WIDTH_CLASSES: Record<string, string> = {
  '3xs': 'sm:w-3xs',
  '2xs': 'sm:w-2xs',
  xs: 'sm:w-xs',
  sm: 'sm:w-sm',
  md: 'sm:w-md',
  lg: 'sm:w-lg',
  xl: 'sm:w-xl',
  '2xl': 'sm:w-2xl',
  '3xl': 'sm:w-3xl',
  '4xl': 'sm:w-4xl',
  '5xl': 'sm:w-5xl',
  '6xl': 'sm:w-6xl',
  '7xl': 'sm:w-7xl',
  none: 'sm:w-auto',
  min: 'sm:w-min',
  max: 'sm:w-max',
  fit: 'sm:w-fit',
  prose: 'sm:w-[65ch]',
  container: 'sm:container',
  'screen-sm': 'sm:w-(--breakpoint-sm)',
  'screen-md': 'sm:w-(--breakpoint-md)',
  'screen-lg': 'sm:w-(--breakpoint-lg)',
  'screen-xl': 'sm:w-(--breakpoint-xl)',
  'screen-2xl': 'sm:w-(--breakpoint-2xl)',
  full: 'sm:w-full',
  screen: 'sm:w-screen',
}

/** Width classes of the filters dialog (`FiltersLayout::Modal`). */
export const FILTERS_MODAL_WIDTH_CLASSES: Record<string, string> = {
  '3xs': 'sm:max-w-3xs',
  '2xs': 'sm:max-w-2xs',
  xs: 'sm:max-w-xs',
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
  '5xl': 'sm:max-w-5xl',
  '6xl': 'sm:max-w-6xl',
  '7xl': 'sm:max-w-7xl',
  none: 'sm:max-w-none',
  min: 'sm:max-w-min',
  max: 'sm:max-w-max',
  fit: 'sm:max-w-fit',
  prose: 'sm:max-w-prose',
  container: 'sm:container',
  'screen-sm': 'sm:max-w-(--breakpoint-sm)',
  'screen-md': 'sm:max-w-(--breakpoint-md)',
  'screen-lg': 'sm:max-w-(--breakpoint-lg)',
  'screen-xl': 'sm:max-w-(--breakpoint-xl)',
  'screen-2xl': 'sm:max-w-(--breakpoint-2xl)',
  full: 'sm:max-w-full',
  screen: 'sm:max-w-screen',
}

/** Width classes of a sidebar filters layout (`BeforeContent` / `AfterContent`). */
export const FILTERS_SIDEBAR_WIDTH_CLASSES: Record<string, string> = {
  '3xs': 'lg:w-3xs',
  '2xs': 'lg:w-2xs',
  xs: 'lg:w-xs',
  sm: 'lg:w-sm',
  md: 'lg:w-md',
  lg: 'lg:w-lg',
  xl: 'lg:w-xl',
  '2xl': 'lg:w-2xl',
  '3xl': 'lg:w-3xl',
  '4xl': 'lg:w-4xl',
  '5xl': 'lg:w-5xl',
  '6xl': 'lg:w-6xl',
  '7xl': 'lg:w-7xl',
  none: 'lg:w-auto',
  min: 'lg:w-min',
  max: 'lg:w-max',
  fit: 'lg:w-fit',
  prose: 'lg:w-[65ch]',
  container: 'lg:container',
  'screen-sm': 'lg:w-(--breakpoint-sm)',
  'screen-md': 'lg:w-(--breakpoint-md)',
  'screen-lg': 'lg:w-(--breakpoint-lg)',
  'screen-xl': 'lg:w-(--breakpoint-xl)',
  'screen-2xl': 'lg:w-(--breakpoint-2xl)',
  full: 'lg:w-full',
  screen: 'lg:w-screen',
}

export type FiltersPlacement = 'toolbar' | 'above' | 'below' | 'before' | 'after'

/**
 * Where a filters layout renders: in the toolbar (dropdown, modal), above or below the
 * table, or in a sidebar before / after it.
 */
export function filtersPlacement(layout: TableSchema['filtersLayout']): FiltersPlacement {
  if (layout.startsWith('above-content')) return 'above'
  if (layout === 'below-content') return 'below'
  if (layout.startsWith('before-content')) return 'before'
  if (layout.startsWith('after-content')) return 'after'

  return 'toolbar'
}

/** Whether the filters panel of this layout can be collapsed. */
export function filtersCollapsible(layout: TableSchema['filtersLayout']): boolean {
  return layout.endsWith('-collapsible')
}

/** The width class of a filters form for its layout, or undefined for the default. */
export function filtersFormWidthClass(
  table: Pick<TableSchema, 'filtersLayout' | 'filtersFormWidth'>,
): string | undefined {
  const width = table.filtersFormWidth as FiltersFormWidth | undefined

  if (!width) return undefined

  const placement = filtersPlacement(table.filtersLayout)

  if (placement === 'before' || placement === 'after') return FILTERS_SIDEBAR_WIDTH_CLASSES[width]
  if (table.filtersLayout === 'modal') return FILTERS_MODAL_WIDTH_CLASSES[width]
  if (placement === 'toolbar') return FILTERS_FORM_WIDTH_CLASSES[width]

  return undefined
}

/**
 * Classes of a `stackedOnMobile()` table: below `md` the table, its body and rows are
 * blocks and each row is a card; every cell shows its column label (`stackedCellLabel`).
 */
export const STACKED_TABLE_CLASSES = {
  table: 'max-md:block',
  header: 'max-md:hidden',
  body: 'max-md:block',
  row: 'max-md:flex max-md:flex-col max-md:gap-2 max-md:border-b max-md:px-4 max-md:py-3',
  cell: 'max-md:flex max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 max-md:p-0 max-md:text-start max-md:whitespace-normal',
  /** Cells with their own responsive visibility keep it (no flex override). */
  responsiveCell: 'max-md:p-0 max-md:text-start max-md:whitespace-normal',
  controlCell: 'max-md:flex max-md:items-center max-md:justify-start max-md:p-0',
  actionsCell: 'max-md:flex max-md:items-center max-md:justify-end max-md:p-0',
  label: 'text-muted-foreground shrink-0 text-xs font-medium md:hidden',
  footer: 'max-md:hidden',
} as const

/** Classes of a data cell in a stacked-on-mobile table. */
export function stackedCellClasses(
  column: Pick<ColumnSchema, 'visibleFrom' | 'hiddenFrom'>,
): string {
  return column.visibleFrom || column.hiddenFrom
    ? STACKED_TABLE_CLASSES.responsiveCell
    : STACKED_TABLE_CLASSES.cell
}
