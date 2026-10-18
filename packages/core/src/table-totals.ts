import { requestJson } from './http'
import { currentPageQuery } from './page-query'
import type {
  AnyPaginationSchema,
  PaginationSchema,
  TableSchema,
  TableTotalsSchema,
} from './schema/table'
import { createStore } from './store'

interface TotalsEntry {
  value?: TableTotalsSchema
  /** Shown, but asked for again: a mutation may have changed it. */
  stale?: boolean
  failed?: boolean
  pending?: Promise<void>
}

const entries = new Map<string, TotalsEntry>()

/**
 * Bumped whenever deferred table totals arrive or are invalidated: renderers subscribe to
 * re-render their tables (and ask again for stale totals).
 */
export const tableTotalsStore = createStore(0)

function bump(): void {
  tableTotalsStore.set((version) => version + 1)
}

function entryKey(table: Pick<TableSchema, 'deferredTotals'>, component: string): string | null {
  return table.deferredTotals ? `${component}|${table.deferredTotals.key}` : null
}

/** The totals loaded for this table state, if any. */
export function cachedTableTotals(
  table: Pick<TableSchema, 'deferredTotals'>,
  component: string,
): TableTotalsSchema | undefined {
  const key = entryKey(table, component)

  return key === null ? undefined : entries.get(key)?.value
}

export interface LoadTableTotalsOptions {
  /** The `tableTotals` endpoint. */
  url: string | undefined
  /** The page context token. */
  token: string
  /** Context component (`table`, `relationManager:…`, `widget:…`). */
  component: string
}

/**
 * Ask the server for the total and summaries of a `deferTotals()` table, unless this
 * table state already has fresh ones (or a request for them is in flight). A failed
 * request is not retried until the table state changes. Browser only.
 */
export function loadTableTotals(
  table: Pick<TableSchema, 'deferredTotals'>,
  options: LoadTableTotalsOptions,
): Promise<void> | undefined {
  const key = entryKey(table, options.component)

  if (key === null || !options.url || typeof window === 'undefined') return undefined

  const entry = entries.get(key)

  if (entry?.pending) return entry.pending
  if (entry && (entry.failed || (entry.value && !entry.stale))) return undefined

  const pending = requestJson<TableTotalsSchema>(options.url, {
    method: 'POST',
    body: { token: options.token, component: options.component, tableQuery: currentPageQuery() },
  })
    .then((value) => {
      entries.set(key, { value })
    })
    .catch(() => {
      entries.set(key, { value: entry?.value, failed: true })
    })
    .finally(bump)

  entries.set(key, { ...entry, pending })

  return pending
}

/**
 * Mark every loaded total as stale (after a mutation): tables keep showing them and ask
 * again in the background.
 */
export function invalidateTableTotals(): void {
  if (entries.size === 0) return

  for (const [key, entry] of entries) {
    if (entry.pending) continue

    if (entry.value) {
      entries.set(key, { value: entry.value, stale: true })
    } else {
      entries.delete(key)
    }
  }

  bump()
}

/** Forget every loaded total (tests). */
export function resetTableTotals(): void {
  entries.clear()
  bump()
}

/**
 * The table with its deferred totals filled in: numbered pagination with the total and
 * the last page, and the summary rows. Without totals (still loading) the table keeps
 * `pagination.pendingTotal` and `deferredTotals.summaries`, which renderers show as
 * placeholders; after a failed request the placeholders go away.
 */
export function withTableTotals<T extends TableSchema>(
  table: T,
  totals: TableTotalsSchema | undefined,
  failed = false,
): T {
  if (!table.deferredTotals) return table

  if (!totals) {
    if (!failed) return table

    return { ...table, deferredTotals: undefined, pagination: settledPagination(table.pagination) }
  }

  const pagination = table.pagination

  return {
    ...table,
    deferredTotals: undefined,
    pagination:
      pagination && pagination.mode === 'simple' && pagination.pendingTotal
        ? totals.total !== undefined && totals.lastPage !== undefined
          ? ({
              currentPage: pagination.currentPage,
              lastPage: totals.lastPage,
              perPage: pagination.perPage,
              total: totals.total,
              from: pagination.from,
              to: pagination.to,
              pageOptions: pagination.pageOptions,
            } satisfies PaginationSchema)
          : settledPagination(pagination)
        : pagination,
    summaries: totals.summaries ?? table.summaries,
  }
}

/** Whether loading this table's totals failed (show the table without them). */
export function tableTotalsFailed(
  table: Pick<TableSchema, 'deferredTotals'>,
  component: string,
): boolean {
  const key = entryKey(table, component)

  return key !== null && entries.get(key)?.failed === true && !entries.get(key)?.value
}

function settledPagination(
  pagination: AnyPaginationSchema | null | undefined,
): AnyPaginationSchema | null | undefined {
  if (!pagination || pagination.mode !== 'simple' || !pagination.pendingTotal) return pagination

  const { pendingTotal: _pending, ...rest } = pagination

  return rest
}
