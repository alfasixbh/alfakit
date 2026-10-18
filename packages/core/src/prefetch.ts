import { router } from '@inertiajs/core'
import { resolvePartialProps } from './partial-props'
import { buildTableUrl, type TableQuery } from './table'
import { invalidateTableTotals } from './table-totals'

/**
 * How long a prefetched page is reused: navigation links (Inertia `<Link prefetch>`) and
 * a table's next page. Short, and dropped after every mutation.
 */
export const PREFETCH_CACHE_FOR = '10s'

/**
 * Prefetch a table page (hovering or focusing "next") with the same visit `visitTable()`
 * makes, so the click is answered from the cache. Browser only.
 */
export function prefetchTablePage(
  identifier: string | undefined,
  changes: TableQuery,
  only: string[] = ['page'],
): void {
  if (typeof window === 'undefined') return

  const resolved = resolvePartialProps(only)

  router.prefetch(
    buildTableUrl(window.location.href, identifier, changes),
    {
      preserveState: true,
      preserveScroll: true,
      replace: true,
      ...(resolved === undefined ? {} : { only: resolved }),
    },
    { cacheFor: PREFETCH_CACHE_FOR },
  )
}

/**
 * Drop prefetched pages and mark deferred table totals stale: records may have changed.
 */
export function invalidatePrefetchedPages(): void {
  if (typeof window === 'undefined') return

  router.flushAll()
  invalidateTableTotals()
}

/** Internal endpoints that change records (actions, inline edits, reordering, undo, page methods). */
const MUTATING_ENDPOINT = /\/(?:actions(?:\/undo)?|table\/(?:cell|cells|reorder)|pages\/call)\/?$/

/** Whether a successful request to `url` with `method` may have changed records. */
export function isMutatingRequest(url: string, method: string): boolean {
  if (method.toUpperCase() === 'GET') return false

  try {
    return MUTATING_ENDPOINT.test(new URL(url, 'http://localhost').pathname)
  } catch {
    return false
  }
}

/**
 * Invalidate prefetched pages and table totals after every Inertia visit that is not a
 * GET (actions, form saves). Returns a function that removes the listener.
 */
export function installPrefetchInvalidation(): () => void {
  if (typeof window === 'undefined') return () => {}

  return router.on('finish', (event) => {
    if (event.detail.visit.method !== 'get') invalidatePrefetchedPages()
  })
}
