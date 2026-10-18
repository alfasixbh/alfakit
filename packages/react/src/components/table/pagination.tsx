import type { AnyPaginationSchema, TableSchema } from '@alfakit/core'
import {
  extremePageLinks,
  isAppendingPagination,
  nextPageQuery,
  prefetchTablePage,
  previousPageQuery,
  visitTable,
} from '@alfakit/core'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useT } from '../../context'
import { Icon } from '../../lib/icons'
import { Button } from '../ui/button'

export function TablePagination({ table }: { table: TableSchema }) {
  const t = useT()
  const pagination = table.pagination

  if (!pagination) {
    return null
  }

  if (isAppendingPagination(pagination)) {
    return <AppendingPagination table={table} pagination={pagination} />
  }

  const numbered = pagination.mode === undefined || pagination.mode === 'default'
  const pages = numbered ? pageWindow(pagination.currentPage, pagination.lastPage) : []
  const previous = previousPageQuery(pagination)
  const next = nextPageQuery(pagination)
  // `extremePaginationLinks()`: first / last page buttons around numbered pages.
  const extremes = numbered
    ? extremePageLinks(table, pagination.currentPage, pagination.lastPage)
    : null
  const summary = numbered
    ? t(
        'table.showing',
        { first: pagination.from, last: pagination.to, total: pagination.total },
        `Showing ${pagination.from}–${pagination.to} of ${pagination.total}`,
      )
    : t(
        'table.showing_range',
        { first: pagination.from, last: pagination.to },
        `Showing ${pagination.from}–${pagination.to}`,
      )

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-muted-foreground flex items-center gap-3 text-sm">
        <span>{summary}</span>
        {/* `deferTotals()`: the total and page numbers arrive after the rows. */}
        {pagination.mode === 'simple' && pagination.pendingTotal && (
          <span
            data-slot="pagination-total"
            aria-busy="true"
            aria-label={t('loading', {}, 'Loading')}
            className="bg-muted-foreground/20 inline-block h-4 w-12 animate-pulse rounded-md"
          />
        )}
        <PerPageSelect table={table} pagination={pagination} />
      </div>
      {(previous || next) && (
        <nav className="flex items-center gap-1" aria-label={t('pagination', {}, 'Pagination')}>
          {extremes && (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              data-slot="pagination-first"
              disabled={extremes.first === null}
              onClick={() => visitTable(table.identifier, { page: 1 }, ['page'])}
              aria-label={t('table.first_page', {}, 'First page')}
            >
              <Icon
                name="alfakit::support.pagination.first-button"
                fallback={ChevronsLeftIcon}
                className="rtl:rotate-180"
              />
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!previous}
            onClick={() => previous && visitTable(table.identifier, previous, ['page'])}
            aria-label={t('table.previous', {}, 'Previous')}
          >
            <Icon
              name="alfakit::support.pagination.previous-button"
              fallback={ChevronLeftIcon}
              className="rtl:rotate-180"
            />
          </Button>
          {numbered &&
            !pagination.simple &&
            pages.map((page, index) =>
              page === null ? (
                <span key={`gap-${index}`} className="text-muted-foreground px-1">
                  …
                </span>
              ) : (
                <Button
                  key={page}
                  type="button"
                  variant={page === pagination.currentPage ? 'default' : 'outline'}
                  size="icon-sm"
                  onClick={() => visitTable(table.identifier, { page }, ['page'])}
                  aria-current={page === pagination.currentPage ? 'page' : undefined}
                >
                  {page}
                </Button>
              ),
            )}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!next}
            onClick={() => next && visitTable(table.identifier, next, ['page'])}
            // The next page is fetched while hovering or focusing (cached for a few seconds).
            onPointerEnter={() => next && prefetchTablePage(table.identifier, next)}
            onFocus={() => next && prefetchTablePage(table.identifier, next)}
            aria-label={t('table.next', {}, 'Next')}
          >
            <Icon
              name="alfakit::support.pagination.next-button"
              fallback={ChevronRightIcon}
              className="rtl:rotate-180"
            />
          </Button>
          {extremes && (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              data-slot="pagination-last"
              disabled={extremes.last === null}
              onClick={() =>
                extremes.last !== null &&
                visitTable(table.identifier, { page: extremes.last }, ['page'])
              }
              aria-label={t('table.last_page', {}, 'Last page')}
            >
              <Icon
                name="alfakit::support.pagination.last-button"
                fallback={ChevronsRightIcon}
                className="rtl:rotate-180"
              />
            </Button>
          )}
        </nav>
      )}
    </div>
  )
}

function PerPageSelect({
  table,
  pagination,
}: {
  table: TableSchema
  pagination: AnyPaginationSchema
}) {
  const t = useT()

  if (pagination.pageOptions.length <= 1) return null

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only sm:not-sr-only">{t('table.per_page', {}, 'Per page')}</span>
      <select
        value={String(pagination.perPage)}
        onChange={(event) =>
          visitTable(
            table.identifier,
            { perPage: event.target.value === 'all' ? 'all' : Number(event.target.value) },
            ['page'],
          )
        }
        className="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
      >
        {pagination.pageOptions.map((option) => (
          <option key={option} value={String(option)}>
            {option === 'all' ? t('table.all', {}, 'All') : option}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * Load more / infinite scroll: the server returns every record up to the requested page,
 * so asking for the next page appends it (and reloads keep what was already shown). A
 * request that fails (network, server error) shows a retry control instead of staying on
 * "Loading more…"; infinite scroll waits for the retry rather than requesting again.
 */
function AppendingPagination({
  table,
  pagination,
}: {
  table: TableSchema
  pagination: Extract<AnyPaginationSchema, { mode: 'load-more' | 'infinite' }>
}) {
  const t = useT()
  const sentinel = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [loadedTo, setLoadedTo] = useState(pagination.to)
  const next = nextPageQuery(pagination)

  // A response with more records ends the in-flight request.
  if (loadedTo !== pagination.to) {
    setLoadedTo(pagination.to)
    setLoading(false)
    setFailed(false)
  }

  const loadMore = () => {
    if (!next || loading) return

    let succeeded = false
    let cancelled = false
    setLoading(true)
    setFailed(false)
    visitTable(table.identifier, next, ['page'], {
      onSuccess: () => {
        succeeded = true
      },
      onCancel: () => {
        cancelled = true
      },
      onFinish: () => {
        setLoading(false)
        if (!succeeded && !cancelled) setFailed(true)
      },
    })
  }

  const loadMoreRef = useRef(loadMore)

  useEffect(() => {
    loadMoreRef.current = loadMore
  })

  useEffect(() => {
    if (
      pagination.mode !== 'infinite' ||
      !next ||
      failed ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return
    }

    const element = sentinel.current

    if (!element) return

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMoreRef.current()
    })

    observer.observe(element)

    return () => observer.disconnect()
  }, [pagination.mode, next, failed])

  const retry = (
    <div className="flex items-center gap-2 text-sm" role="alert">
      <span className="text-destructive">
        {t('table.load_more_failed', {}, "Couldn't load more records.")}
      </span>
      <Button type="button" variant="outline" size="sm" onClick={loadMore}>
        {t('retry', {}, 'Retry')}
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <div className="text-muted-foreground flex items-center gap-3 text-sm">
        <span>
          {t(
            'table.showing_range',
            { first: pagination.from, last: pagination.to },
            `Showing ${pagination.from}–${pagination.to}`,
          )}
        </span>
        <PerPageSelect table={table} pagination={pagination} />
      </div>
      {next &&
        (failed ? (
          retry
        ) : pagination.mode === 'infinite' ? (
          <div ref={sentinel} className="text-muted-foreground text-sm" aria-live="polite">
            {loading ? t('table.loading_more', {}, 'Loading more…') : null}
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={loadMore}>
            {loading
              ? t('table.loading_more', {}, 'Loading more…')
              : t('load_more', {}, 'Load more')}
          </Button>
        ))}
    </div>
  )
}

function pageWindow(current: number, last: number): Array<number | null> {
  if (last <= 7) {
    return Array.from({ length: last }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, last, current - 1, current, current + 1])
  const sorted = [...pages].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b)
  const result: Array<number | null> = []

  sorted.forEach((page, index) => {
    if (index > 0 && page - (sorted[index - 1] ?? 0) > 1) {
      result.push(null)
    }

    result.push(page)
  })

  return result
}
