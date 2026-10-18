import { HttpError, inertiaVisit, requestJson } from './http'
import type { TableSchema, TableViewItemSchema, TableViewsSchema } from './schema/table'
import { tableQueryKey } from './table'

/**
 * Saved table views (`Table::savedViews()` / `views()`): the URL helpers, the request to
 * the views endpoint and how the views are grouped in the menu. The server decides
 * everything else (what a view holds, who may change it, whether it is modified).
 */

/** Table state keys a view replaces (every one of them, prefixed with the identifier). */
const VIEW_STATE_KEYS = [
  'sort',
  'direction',
  'search',
  'filters',
  'columnSearch',
  'columns',
  'perPage',
  'group',
  'groupDirection',
  'page',
  'cursor',
] as const

/**
 * The URL that opens a view: the table's own state keys are dropped (the view brings its
 * state) and `?view=` names the view. `null` opens the table without a view (`?view=`).
 */
export function tableViewUrl(
  currentUrl: string,
  identifier: string | undefined,
  queryKey: string,
  view: string | null,
): string {
  const url = new URL(
    currentUrl,
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
  )
  const params = url.searchParams

  for (const name of VIEW_STATE_KEYS) {
    const key = tableQueryKey(identifier, name)

    for (const existing of [...params.keys()]) {
      if (existing === key || existing.startsWith(`${key}[`)) params.delete(existing)
    }
  }

  params.set(queryKey, view ?? '')

  return url.pathname + `?${params.toString()}` + url.hash
}

/** Open a view (or, with null, the table without one). */
export function visitTableView(
  table: Pick<TableSchema, 'identifier' | 'views'>,
  view: string | null,
): void {
  if (!table.views || typeof window === 'undefined') return

  inertiaVisit(tableViewUrl(window.location.href, table.identifier, table.views.queryKey, view), {
    preserveState: true,
    preserveScroll: true,
    replace: true,
  })
}

/** The views menu: code views, then the team's shared views, then the user's own. */
export function groupTableViews(items: TableViewItemSchema[]): {
  preset: TableViewItemSchema[]
  shared: TableViewItemSchema[]
  personal: TableViewItemSchema[]
} {
  return {
    preset: items.filter((item) => item.type === 'preset'),
    shared: items.filter((item) => item.type === 'shared'),
    personal: items.filter((item) => item.type === 'personal'),
  }
}

/** The active view's item, if any. */
export function activeTableView(
  views: TableViewsSchema | undefined,
): TableViewItemSchema | undefined {
  return views?.active ? views.items.find((item) => item.key === views.active) : undefined
}

export type TableViewOperation =
  | { operation: 'create'; name: string; shared?: boolean }
  | { operation: 'update'; view: string }
  | { operation: 'rename'; view: string; name: string }
  | { operation: 'delete'; view: string }
  | { operation: 'share'; view: string; shared: boolean }
  /** A view key, `''` for "no view", or null to forget the user's default. */
  | { operation: 'default'; view: string | null }

export interface TableViewResponse {
  views?: TableViewsSchema
  /** The view to open (created or updated). */
  view?: string
  /** The view that was deleted. */
  deleted?: string
}

/**
 * Send a views operation. The server reads the table's current state from `tableQuery`
 * (the page's query string), so "Save" and "Update" store exactly what the user sees.
 */
export function requestTableView(
  endpoint: string,
  token: string,
  component: string,
  operation: TableViewOperation,
): Promise<TableViewResponse> {
  // The view an operation targets travels as `target`: `view` is the page's own query key.
  const { view, ...rest } = operation as TableViewOperation & { view?: string | null }

  return requestJson<TableViewResponse>(endpoint, {
    method: 'POST',
    body: {
      token,
      component,
      tableQuery: typeof window !== 'undefined' ? window.location.search : '',
      ...rest,
      ...('view' in operation ? { target: view || null } : {}),
      // `''` ("no view" as the default) would arrive as null: it travels as `none`.
      ...(operation.operation === 'default' && view === '' ? { none: true } : {}),
    },
  })
}

/**
 * What the page does after an operation: open the saved view (create / update), leave a
 * deleted active view, or reload the views (rename, share, default).
 */
export function tableViewFollowUp(
  table: Pick<TableSchema, 'views'>,
  operation: TableViewOperation,
  response: TableViewResponse,
): { open: string | null } | { reload: true } {
  if ((operation.operation === 'create' || operation.operation === 'update') && response.view) {
    return { open: response.view }
  }

  if (operation.operation === 'delete' && table.views?.active === operation.view) {
    return { open: null }
  }

  return { reload: true }
}

/** The validation message of a failed views request (e.g. an empty name), if any. */
export function tableViewError(error: unknown): string | undefined {
  if (error instanceof HttpError) {
    const message = error.errors.name?.[0]

    if (message) return message

    const data = error.data as { message?: string } | null

    return data?.message || error.message
  }

  return error instanceof Error ? error.message : undefined
}
