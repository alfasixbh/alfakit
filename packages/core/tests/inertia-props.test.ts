import type * as InertiaCore from '@inertiajs/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveNavigation, resolvePanelNavigation } from '../src/navigation-state'
import {
  installPrefetchInvalidation,
  isMutatingRequest,
  PREFETCH_CACHE_FOR,
  prefetchTablePage,
} from '../src/prefetch'
import type { NavigationGroupSchema, PanelSchema } from '../src/schema/panel'
import type { TableSchema } from '../src/schema/table'
import {
  cachedTableTotals,
  invalidateTableTotals,
  loadTableTotals,
  resetTableTotals,
  tableTotalsFailed,
  withTableTotals,
} from '../src/table-totals'

const { prefetch, flushAll, listeners } = vi.hoisted(() => ({
  prefetch: vi.fn(),
  flushAll: vi.fn(),
  listeners: new Map<string, (event: unknown) => void>(),
}))

vi.mock('@inertiajs/core', async (importOriginal) => {
  const original = await importOriginal<typeof InertiaCore>()

  return {
    ...original,
    router: {
      ...original.router,
      prefetch,
      flushAll,
      on: (name: string, callback: (event: unknown) => void) => {
        listeners.set(name, callback)
        return () => listeners.delete(name)
      },
    },
  }
})

const navigation: NavigationGroupSchema[] = [
  {
    collapsible: false,
    items: [
      { label: 'Dashboard', icon: 'home', activeIcon: 'home-solid', url: '/admin' },
      {
        label: 'Orders',
        url: '/admin/orders',
        deferredBadge: true,
        children: [{ label: 'Open', url: '/admin/orders/open', deferredBadge: true }],
      },
    ],
  },
]

describe('resolveNavigation', () => {
  it('merges the active items and inline badges by position', () => {
    const [group] = resolveNavigation(
      [
        {
          collapsible: false,
          items: [{ label: 'A', icon: 'a', activeIcon: 'a2' }, { label: 'B' }],
        },
      ],
      { active: ['0.0'], badges: { '0.1': { badge: 3, badgeColor: 'danger' } } },
    )

    expect(group?.items[0]).toEqual({ label: 'A', icon: 'a2', active: true })
    expect(group?.items[1]).toEqual({ label: 'B', badge: 3, badgeColor: 'danger' })
  })

  it('marks deferred badges pending until they arrive, then fills them in', () => {
    const pending = resolveNavigation(navigation, { active: ['0.1', '0.1.0'] }, null)

    expect(pending[0]?.items[1]).toMatchObject({ active: true, badgePending: true })
    expect(pending[0]?.items[1]?.children?.[0]).toMatchObject({ active: true, badgePending: true })

    const loaded = resolveNavigation(navigation, undefined, { '0.1.0': { badge: 7 } })

    expect(loaded[0]?.items[1]?.badgePending).toBeUndefined()
    expect(loaded[0]?.items[1]?.children?.[0]?.badge).toBe(7)
    expect(loaded[0]?.items[0]?.icon).toBe('home')
  })

  it('clears the placeholder once the badges arrive, even when an item has none or zero', () => {
    // An empty PHP array arrives as `[]`; items whose badge resolved to null are left out.
    const empty = resolveNavigation(navigation, undefined, [] as unknown as Record<string, never>)

    expect(empty[0]?.items[1]?.badgePending).toBeUndefined()
    expect(empty[0]?.items[1]?.children?.[0]?.badgePending).toBeUndefined()
    expect(empty[0]?.items[1]?.deferredBadge).toBeUndefined()

    const zero = resolveNavigation(navigation, undefined, { '0.1': { badge: 0 } })

    expect(zero[0]?.items[1]).toMatchObject({ badge: 0 })
    expect(zero[0]?.items[1]?.badgePending).toBeUndefined()
    expect(zero[0]?.items[1]?.children?.[0]?.badgePending).toBeUndefined()
  })
})

describe('resolvePanelNavigation', () => {
  it('returns panels without split navigation unchanged and memoises the rest', () => {
    const plain = {
      navigation: [{ collapsible: false, items: [{ label: 'A', active: true }] }],
    } as unknown as PanelSchema

    expect(resolvePanelNavigation(plain)).toBe(plain)

    const split = { navigation, navigationState: { active: ['0.0'] } } as unknown as PanelSchema
    const first = resolvePanelNavigation(split)

    expect(first).not.toBe(split)
    expect(resolvePanelNavigation(split)).toBe(first)
    expect(first.navigation[0]?.items[0]?.active).toBe(true)

    const badges = { '0.1': { badge: 2 } }

    expect(resolvePanelNavigation(split, badges).navigation[0]?.items[1]?.badge).toBe(2)
  })

  it('shows the last known deferred badges while the next page loads them', () => {
    const panel = { navigation, navigationState: { active: [] } } as unknown as PanelSchema

    resolvePanelNavigation(panel, { '0.1': { badge: 5 } })

    const next = resolvePanelNavigation({ ...panel } as PanelSchema)

    expect(next.navigation[0]?.items[1]).toMatchObject({ badge: 5 })
    expect(next.navigation[0]?.items[1]?.badgePending).toBeUndefined()
  })
})

const deferredTable = {
  deferredTotals: { key: 'k1', summaries: true },
  pagination: {
    mode: 'simple',
    currentPage: 2,
    perPage: 10,
    from: 11,
    to: 20,
    pageOptions: [10, 25],
    simple: true,
    hasMorePages: true,
    pendingTotal: true,
  },
} as unknown as TableSchema

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('table totals', () => {
  beforeEach(() => resetTableTotals())
  afterEach(() => vi.unstubAllGlobals())

  it('turns pending simple pagination into numbered pagination with the totals', () => {
    const table = withTableTotals(deferredTable, {
      total: 42,
      lastPage: 5,
      summaries: { all: { label: 'All', values: {} } },
    })

    expect(table.deferredTotals).toBeUndefined()
    expect(table.pagination).toEqual({
      currentPage: 2,
      lastPage: 5,
      perPage: 10,
      total: 42,
      from: 11,
      to: 20,
      pageOptions: [10, 25],
    })
    expect(table.summaries).toBeDefined()
    expect(withTableTotals(deferredTable, undefined)).toBe(deferredTable)
    expect(withTableTotals(deferredTable, undefined, true).pagination).not.toHaveProperty(
      'pendingTotal',
    )
  })

  it('loads once per table state, reuses the totals and asks again after invalidation', async () => {
    const fetchMock = vi.fn(async () => respond({ total: 9, lastPage: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    const options = { url: '/admin/_alfakit/table/totals', token: 't', component: 'table' }

    await loadTableTotals(deferredTable, options)
    expect(loadTableTotals(deferredTable, options)).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(cachedTableTotals(deferredTable, 'table')).toEqual({ total: 9, lastPage: 1 })
    expect(
      JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body)),
    ).toMatchObject({ token: 't', component: 'table' })

    invalidateTableTotals()
    // Still shown while it reloads.
    expect(cachedTableTotals(deferredTable, 'table')).toEqual({ total: 9, lastPage: 1 })
    await loadTableTotals(deferredTable, options)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    // Another component with the same key is another table.
    expect(cachedTableTotals(deferredTable, 'widget:x')).toBeUndefined()
  })

  it('does not retry a failed request for the same table state', async () => {
    const fetchMock = vi.fn(async () => respond({ message: 'no' }, 500))
    vi.stubGlobal('fetch', fetchMock)
    const options = { url: '/t', token: 't', component: 'table' }

    await loadTableTotals(deferredTable, options)
    expect(tableTotalsFailed(deferredTable, 'table')).toBe(true)
    expect(loadTableTotals(deferredTable, options)).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('prefetching', () => {
  it('prefetches a table page with the visit visitTable() makes and a short cache', () => {
    window.history.replaceState({}, '', '/admin/posts?search=a')
    prefetchTablePage(undefined, { page: 2 })

    expect(prefetch).toHaveBeenCalledWith(
      '/admin/posts?search=a&page=2',
      { preserveState: true, preserveScroll: true, replace: true, only: ['page'] },
      { cacheFor: PREFETCH_CACHE_FOR },
    )
  })

  it('flushes prefetched pages after non-GET visits and mutating requests', () => {
    installPrefetchInvalidation()
    flushAll.mockClear()

    listeners.get('finish')?.({ detail: { visit: { method: 'get' } } })
    expect(flushAll).not.toHaveBeenCalled()

    listeners.get('finish')?.({ detail: { visit: { method: 'post' } } })
    expect(flushAll).toHaveBeenCalledTimes(1)

    expect(isMutatingRequest('/admin/_alfakit/actions', 'POST')).toBe(true)
    expect(isMutatingRequest('/admin/_alfakit/table/cell', 'POST')).toBe(true)
    expect(isMutatingRequest('/admin/_alfakit/schema/refresh', 'POST')).toBe(false)
    expect(isMutatingRequest('/admin/_alfakit/actions', 'GET')).toBe(false)
  })
})
