/**
 * The page's query string (without `?`), sent with action requests as `tableQuery` so the
 * server reads the same table state (sort, search, filters) the page shows. Empty during
 * SSR and when the page has no query string.
 */
export function currentPageQuery(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const query = window.location.search.replace(/^\?/, '')

  return query === '' ? undefined : query
}
