import { inertiaReload, requestJson } from './http'
import type { Alignment } from './schema/common'
import type {
  AnyPaginationSchema,
  BaseColumnSchema,
  Breakpoint,
  ColumnGroupSchema,
  ColumnLayoutNode,
  ColumnSchema,
  SplitLayoutSchema,
  StackLayoutSchema,
  TableSchema,
} from './schema/table'
import type { TableQuery } from './table'

/**
 * One cell of the column-group header row: a group spanning `span` adjacent visible
 * columns, or (without `group`) an ungrouped column whose header spans both rows.
 */
export interface ColumnGroupHeaderCell {
  key: string
  span: number
  group?: ColumnGroupSchema
  column?: ColumnSchema
}

/**
 * The extra header row for `ColumnGroup`s. Adjacent visible columns of the same group
 * share one header; a group split by a reordered column gets one header per run.
 * Returns null when the table has no groups.
 */
export function columnGroupHeaderRow(
  columns: ColumnSchema[],
  groups: ColumnGroupSchema[] | undefined,
): ColumnGroupHeaderCell[] | null {
  if (!groups || groups.length === 0) {
    return null
  }

  const groupOf = new Map<string, ColumnGroupSchema>()

  for (const group of groups) {
    for (const name of group.columns) {
      groupOf.set(name, group)
    }
  }

  const cells: ColumnGroupHeaderCell[] = []

  for (const column of columns) {
    const group = groupOf.get(column.name)
    const previous = cells[cells.length - 1]

    if (group && previous?.group === group) {
      previous.span += 1
    } else if (group) {
      cells.push({ key: `group:${group.label}:${column.name}`, span: 1, group })
    } else {
      cells.push({ key: `column:${column.name}`, span: 1, column })
    }
  }

  return cells
}

/** Whether a column sits under a group header (so its own header is in the second row). */
export function isGroupedColumn(name: string, groups: ColumnGroupSchema[] | undefined): boolean {
  return Boolean(groups?.some((group) => group.columns.includes(name)))
}

/** Column names referenced anywhere in a content layout, in order. */
export function layoutColumnNames(nodes: ColumnLayoutNode[] | undefined): string[] {
  const names: string[] = []

  for (const node of nodes ?? []) {
    if (node.type === 'Column') {
      names.push(node.name)
    } else {
      names.push(...layoutColumnNames(node.schema))
    }
  }

  return names
}

const SPLIT_FROM: Record<Breakpoint | 'default', string> = {
  default: 'flex-row items-center',
  sm: 'flex-col sm:flex-row sm:items-center',
  md: 'flex-col md:flex-row md:items-center',
  lg: 'flex-col lg:flex-row lg:items-center',
  xl: 'flex-col xl:flex-row xl:items-center',
  '2xl': 'flex-col 2xl:flex-row 2xl:items-center',
}

/** Classes of a `Split`: side by side from its breakpoint, stacked below it. */
export function splitClasses(layout: Pick<SplitLayoutSchema, 'from'>): string {
  return `flex gap-3 ${SPLIT_FROM[layout.from ?? 'default']}`
}

const VISIBLE_FROM: Record<Breakpoint, string> = {
  sm: 'hidden sm:flex',
  md: 'hidden md:flex',
  lg: 'hidden lg:flex',
  xl: 'hidden xl:flex',
  '2xl': 'hidden 2xl:flex',
}

const HIDDEN_FROM: Record<Breakpoint, string> = {
  sm: 'sm:hidden',
  md: 'md:hidden',
  lg: 'lg:hidden',
  xl: 'xl:hidden',
  '2xl': '2xl:hidden',
}

/** Responsive visibility classes for `visibleFrom()` / `hiddenFrom()`. */
export function layoutVisibilityClasses(layout: {
  visibleFrom?: Breakpoint
  hiddenFrom?: Breakpoint
}): string {
  return [
    layout.visibleFrom ? VISIBLE_FROM[layout.visibleFrom] : '',
    layout.hiddenFrom ? HIDDEN_FROM[layout.hiddenFrom] : '',
  ]
    .filter(Boolean)
    .join(' ')
}

const VISIBLE_FROM_CELL: Record<Breakpoint, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
  '2xl': 'hidden 2xl:table-cell',
}

const VISIBLE_FROM_BLOCK: Record<Breakpoint, string> = {
  sm: 'hidden sm:block',
  md: 'hidden md:block',
  lg: 'hidden lg:block',
  xl: 'hidden xl:block',
  '2xl': 'hidden 2xl:block',
}

/**
 * Responsive visibility classes for a column's `visibleFrom()` / `hiddenFrom()`: for its
 * header and cells in a table (`table-cell`), or its block in a content layout.
 */
export function columnVisibilityClasses(
  column: Pick<BaseColumnSchema, 'visibleFrom' | 'hiddenFrom'>,
  display: 'table-cell' | 'block' = 'table-cell',
): string {
  const visible = display === 'block' ? VISIBLE_FROM_BLOCK : VISIBLE_FROM_CELL

  return [
    column.visibleFrom ? visible[column.visibleFrom] : '',
    column.hiddenFrom ? HIDDEN_FROM[column.hiddenFrom] : '',
  ]
    .filter(Boolean)
    .join(' ')
}

const STACK_SPACE: Record<number, string> = { 1: 'gap-1', 2: 'gap-2', 3: 'gap-3' }

const STACK_ALIGN: Partial<Record<Alignment, string>> = {
  start: 'items-start text-start',
  center: 'items-center text-center',
  end: 'items-end text-end',
}

/** Classes of a `Stack`: a vertical flex column with its gap and alignment. */
export function stackClasses(layout: Pick<StackLayoutSchema, 'space' | 'alignment'>): string {
  return [
    'flex flex-col',
    STACK_SPACE[layout.space ?? 0] ?? 'gap-0.5',
    layout.alignment ? STACK_ALIGN[layout.alignment] : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/** Inside a `Split`, whether a node takes the remaining width. */
export function layoutNodeGrows(node: ColumnLayoutNode, columns: ColumnSchema[]): boolean {
  if (node.type === 'Column') {
    return columns.find((column) => column.name === node.name)?.grow !== false
  }

  return node.grow !== false
}

/** Record actions placed at the start of the row (before or after the checkbox). */
export function recordActionsAtStart(position: TableSchema['recordActionsPosition']): boolean {
  return position === 'before-cells' || position === 'before-columns'
}

/** The total record count, when the pagination mode knows it. */
export function paginationTotal(pagination: AnyPaginationSchema | null | undefined): number | null {
  if (!pagination || ('mode' in pagination && pagination.mode && pagination.mode !== 'default')) {
    return null
  }

  return 'total' in pagination ? pagination.total : null
}

/** Load more and infinite scroll keep earlier pages and append the next one. */
export function isAppendingPagination(
  pagination: AnyPaginationSchema | null | undefined,
): pagination is Extract<AnyPaginationSchema, { mode: 'load-more' | 'infinite' }> {
  return pagination?.mode === 'load-more' || pagination?.mode === 'infinite'
}

/**
 * The table query for the next page of a simple, cursor or appending paginator, or null
 * on the last page.
 */
export function nextPageQuery(
  pagination: AnyPaginationSchema | null | undefined,
): TableQuery | null {
  if (!pagination) return null

  switch (pagination.mode) {
    case 'cursor':
      return pagination.hasMorePages && pagination.nextCursor
        ? { cursor: pagination.nextCursor }
        : null
    case 'simple':
    case 'load-more':
    case 'infinite':
      return pagination.hasMorePages ? { page: pagination.currentPage + 1 } : null
    default:
      return pagination.currentPage < pagination.lastPage
        ? { page: pagination.currentPage + 1 }
        : null
  }
}

/** The table query for the previous page, or null on the first page. */
export function previousPageQuery(
  pagination: AnyPaginationSchema | null | undefined,
): TableQuery | null {
  if (!pagination || isAppendingPagination(pagination)) return null

  if (pagination.mode === 'cursor') {
    return pagination.previousCursor ? { cursor: pagination.previousCursor } : null
  }

  return pagination.currentPage > 1 ? { page: pagination.currentPage - 1 } : null
}

/** Move a column one step in the user's column order. */
export function moveColumn(names: readonly string[], name: string, offset: -1 | 1): string[] {
  const from = names.indexOf(name)
  const to = from + offset

  if (from < 0 || to < 0 || to >= names.length) {
    return [...names]
  }

  const next = [...names]
  const [moved] = next.splice(from, 1)

  if (moved !== undefined) next.splice(to, 0, moved)

  return next
}

/** Drop a dragged column onto another: it takes the target's position in the order. */
export function moveColumnTo(names: readonly string[], name: string, target: string): string[] {
  const from = names.indexOf(name)
  const to = names.indexOf(target)

  if (from < 0 || to < 0 || from === to) {
    return [...names]
  }

  const next = [...names]
  const [moved] = next.splice(from, 1)

  if (moved !== undefined) next.splice(to, 0, moved)

  return next
}

/**
 * Where a column sits in the column manager, for screen readers: inside a column group
 * it counts among the group's columns (`group` is its label); otherwise among the
 * top-level items, where a column group counts as one item.
 */
export interface ColumnManagerPosition {
  position: number
  count: number
  group?: string
}

/** The column group (of `columnGroups`) a column belongs to. */
function columnGroupOf(
  name: string,
  groups: readonly ColumnGroupSchema[] | undefined,
): ColumnGroupSchema | undefined {
  return groups?.find((group) => group.columns.includes(name))
}

/**
 * The top-level items of a column order: an ungrouped column, or the contiguous columns
 * of one column group.
 */
function columnManagerItems(
  order: readonly string[],
  groups: readonly ColumnGroupSchema[] | undefined,
): string[][] {
  const items: string[][] = []
  let current: ColumnGroupSchema | undefined

  for (const name of order) {
    const group = columnGroupOf(name, groups)
    const last = items[items.length - 1]

    if (group && group === current && last) {
      last.push(name)
    } else {
      items.push([name])
    }

    current = group
  }

  return items
}

export function columnManagerPosition(
  order: readonly string[],
  name: string,
  groups?: readonly ColumnGroupSchema[],
): ColumnManagerPosition {
  const group = columnGroupOf(name, groups)

  if (group) {
    const siblings = order.filter((column) => group.columns.includes(column))

    return { position: siblings.indexOf(name) + 1, count: siblings.length, group: group.label }
  }

  const items = columnManagerItems(order, groups)

  return {
    position: items.findIndex((item) => item.includes(name)) + 1,
    count: items.length,
  }
}

/**
 * Move a column one step in the column manager: a grouped column swaps with its
 * neighbour in the same group; an ungrouped column moves past the neighbouring item
 * (a whole column group), so groups stay together. Returns the order unchanged at an edge.
 */
export function moveColumnInManager(
  order: readonly string[],
  name: string,
  offset: -1 | 1,
  groups?: readonly ColumnGroupSchema[],
): string[] {
  const group = columnGroupOf(name, groups)

  if (group) {
    const siblings = order.filter((column) => group.columns.includes(column))
    const neighbour = siblings[siblings.indexOf(name) + offset]

    if (neighbour === undefined) return [...order]

    const next = [...order]
    next[order.indexOf(name)] = neighbour
    next[order.indexOf(neighbour)] = name

    return next
  }

  const items = columnManagerItems(order, groups)
  const index = items.findIndex((item) => item.includes(name))
  const target = index + offset

  if (index < 0 || target < 0 || target >= items.length) return [...order]

  const next = [...items]
  const [moved] = next.splice(index, 1)

  if (moved !== undefined) next.splice(target, 0, moved)

  return next.flat()
}

/** The columns in a (draft) column order; columns missing from it keep their place at the end. */
export function orderColumnsBy<T extends { name: string }>(
  columns: readonly T[],
  order: readonly string[] | null | undefined,
): T[] {
  if (!order) return [...columns]

  const rank = (name: string) => {
    const index = order.indexOf(name)

    return index < 0 ? order.length : index
  }

  return [...columns].sort((a, b) => rank(a.name) - rank(b.name))
}

/** Whether a draft column order differs from the applied one. */
export function columnOrderChanged(applied: readonly string[], draft: readonly string[]): boolean {
  return applied.length !== draft.length || applied.some((name, index) => draft[index] !== name)
}

/**
 * Keep keyboard focus on a column manager move button after a move: once the list has
 * re-rendered, refocus it, or the other move button when it became disabled at an edge.
 */
export function keepMoveButtonFocus(button: HTMLElement | null | undefined): void {
  if (!button || typeof document === 'undefined' || document.activeElement !== button) return

  const controls = button.parentElement
  const schedule =
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (callback: () => void) => setTimeout(callback, 0)

  schedule(() => {
    const active = document.activeElement

    if (active !== button && active !== document.body && active !== null) return

    if (button.isConnected && !(button as HTMLButtonElement).disabled) {
      button.focus()

      return
    }

    controls?.querySelector<HTMLElement>('button:not(:disabled)')?.focus()
  })
}

/**
 * Store the user's column order on the server (per user, in the session), then reload the
 * table so it renders in the new order. `reload: false` when a table visit follows (Reset,
 * Apply with visibility changes): that visit renders the new order, and a reload of the
 * current URL running alongside it could finish last and bring the old columns back.
 */
export async function saveColumnOrder(
  endpoint: string,
  token: string,
  component: string,
  columns: string[],
  options: { reload?: boolean } = {},
): Promise<string[]> {
  const response = await requestJson<{ columns: string[] }>(endpoint, {
    method: 'POST',
    body: { token, component, columns },
  })

  if (options.reload ?? true) inertiaReload({ only: ['page'] })

  return response.columns
}
