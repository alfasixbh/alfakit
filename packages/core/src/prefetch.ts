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

/** Mutations so far; a page last shown before the latest one has stale props. */
let mutationCount = 0

/** The mutation count when each URL was last shown. */
const shownAt = new Map<string, number>()

/**
 * Drop prefetched pages and mark deferred table totals stale: records may have changed.
 */
export function invalidatePrefetchedPages(): void {
  if (typeof window === 'undefined') return

  mutationCount++
  router.flushAll()
  invalidateTableTotals()
}

/**
 * Internal endpoints that change records or what a page shows (actions, inline edits,
 * reordering, undo, page methods, saved views and column order: W-S2-14).
 */
const MUTATING_ENDPOINT =
  /\/(?:actions(?:\/undo)?|table\/(?:cell|cells|reorder|views|columns)|pages\/call)\/?$/

/** Whether a successful request to `url` with `method` may have changed records. */
export function isMutatingRequest(url: string, method: string): boolean {
  if (method.toUpperCase() === 'GET') return false

  try {
    return MUTATING_ENDPOINT.test(new URL(url, 'http://localhost').pathname)
  } catch {
    return false
  }
}

let installed = false

/**
 * Invalidate prefetched pages and table totals after every Inertia visit that is not a
 * GET (actions, form saves), and reload a page the browser's Back or Forward button
 * restores from history when records changed since it was shown: Inertia restores the
 * saved props without asking the server. Returns a function that removes the listeners.
 */
export function installPrefetchInvalidation(): () => void {
  // Panels and standalone components on one page share the listeners.
  if (typeof window === 'undefined' || installed) return () => {}

  installed = true
  let restoring = false
  // The reload of a restored page still in flight. Another Back or Forward cancels it: its
  // response would replace the history entry the browser has moved on to.
  let pendingReload: { cancel(): void } | null = null
  const onPopstate = (): void => {
    restoring = true
    pendingReload?.cancel()
    pendingReload = null
  }
  window.addEventListener('popstate', onPopstate)

  // A visit started after the popstate (a hash-only change fires no navigate) is not a restore.
  const removeStart = router.on('start', () => {
    restoring = false
  })
  const removeFinish = router.on('finish', (event) => {
    if (event.detail.visit.method !== 'get') invalidatePrefetchedPages()
  })
  const removeNavigate = router.on('navigate', (event) => {
    const url = event.detail.page.url
    const restored = restoring
    restoring = false

    // A URL never shown in this page load may come from before it: reload it too.
    if (restored && (shownAt.get(url) ?? -1) < mutationCount) {
      // Without the restored state: forms fill their inputs when they mount, so a reload that
      // kept it showed the saved page's old values (a restored page has no unsaved input).
      // `router.reload()` always keeps the state, hence the visit.
      router.visit(window.location.href, {
        preserveScroll: true,
        preserveState: false,
        replace: true,
        async: true,
        headers: { 'Cache-Control': 'no-cache' },
        onCancelToken: (token) => {
          pendingReload = token
        },
        onFinish: () => {
          pendingReload = null
        },
      })
      return
    }

    shownAt.set(url, mutationCount)
  })

  return () => {
    installed = false
    pendingReload?.cancel()
    pendingReload = null
    window.removeEventListener('popstate', onPopstate)
    removeStart()
    removeFinish()
    removeNavigate()
  }
}
