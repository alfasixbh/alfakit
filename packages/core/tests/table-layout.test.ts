import { describe, expect, it, vi } from 'vitest'
import type * as Http from '../src/http'
import type { ColumnSchema } from '../src/schema/table'
import { buildTableUrl } from '../src/table'
import {
  columnGroupHeaderRow,
  columnVisibilityClasses,
  isAppendingPagination,
  isGroupedColumn,
  layoutColumnNames,
  layoutNodeGrows,
  layoutVisibilityClasses,
  moveColumn,
  moveColumnTo,
  nextPageQuery,
  paginationTotal,
  previousPageQuery,
  recordActionsAtStart,
  saveColumnOrder,
  splitClasses,
  stackClasses,
} from '../src/table-layout'

const jsonCalls: { url: string; body: unknown }[] = []
const reloads: unknown[] = []

vi.mock('../src/http', async (importOriginal) => {
  const original = await importOriginal<typeof Http>()

  return {
    ...original,
    requestJson: async (url: string, options: { body?: { columns?: string[] } } = {}) => {
      jsonCalls.push({ url, body: options.body })

      return { columns: options.body?.columns ?? [] }
    },
    inertiaReload: (options: unknown) => {
      reloads.push(options)
    },
  }
})

const column = (name: string, extra: Partial<ColumnSchema> = {}): ColumnSchema => ({
  type: 'TextColumn',
  name,
  label: name,
  ...extra,
})

describe('column groups', () => {
  const groups = [{ label: 'Details', columns: ['status', 'rating'] }]

  it('spans adjacent grouped columns and gives ungrouped columns their own cell', () => {
    const row = columnGroupHeaderRow(
      [column('title'), column('status'), column('rating'), column('slug')],
      groups,
    )

    expect(row?.map((cell) => [cell.group?.label ?? cell.column?.name, cell.span])).toEqual([
      ['title', 1],
      ['Details', 2],
      ['slug', 1],
    ])
  })

  it('splits a group interrupted by a reordered column', () => {
    const row = columnGroupHeaderRow([column('status'), column('title'), column('rating')], groups)

    expect(row?.map((cell) => cell.span)).toEqual([1, 1, 1])
    expect(row?.filter((cell) => cell.group).length).toBe(2)
  })

  it('returns null without groups', () => {
    expect(columnGroupHeaderRow([column('title')], undefined)).toBeNull()
    expect(isGroupedColumn('status', groups)).toBe(true)
    expect(isGroupedColumn('title', groups)).toBe(false)
  })
})

describe('content layouts', () => {
  it('lists the columns a layout references', () => {
    expect(
      layoutColumnNames([
        {
          type: 'Split',
          schema: [
            { type: 'Column', name: 'a' },
            { type: 'Stack', schema: [{ type: 'Column', name: 'b' }] },
          ],
        },
        { type: 'Column', name: 'c' },
      ]),
    ).toEqual(['a', 'b', 'c'])
  })

  it('spells out responsive classes', () => {
    // A split follows the record's width (its `@container`), not the viewport.
    expect(splitClasses({ from: 'md' })).toBe('flex gap-3 flex-col @xs:flex-row @xs:items-center')
    expect(splitClasses({ from: '2xl' })).toBe(
      'flex gap-3 flex-col @3xl:flex-row @3xl:items-center',
    )
    expect(splitClasses({})).toBe('flex gap-3 flex-row items-center')
    expect(stackClasses({ space: 2, alignment: 'end' })).toBe(
      'flex flex-col gap-2 items-end text-end',
    )
    expect(stackClasses({})).toBe('flex flex-col gap-0.5')
    expect(layoutVisibilityClasses({ visibleFrom: 'lg', hiddenFrom: '2xl' })).toBe(
      'hidden lg:flex 2xl:hidden',
    )
  })

  it('hides a column below / from its breakpoints as a table cell or a layout block', () => {
    expect(columnVisibilityClasses({ visibleFrom: 'md' })).toBe('hidden md:table-cell')
    expect(columnVisibilityClasses({ hiddenFrom: 'lg' })).toBe('lg:hidden')
    expect(columnVisibilityClasses({ visibleFrom: 'sm', hiddenFrom: '2xl' }, 'block')).toBe(
      'hidden sm:block 2xl:hidden',
    )
    expect(columnVisibilityClasses({})).toBe('')
  })

  it('knows which nodes grow inside a split', () => {
    const columns = [column('avatar', { grow: false }), column('name')]

    expect(layoutNodeGrows({ type: 'Column', name: 'avatar' }, columns)).toBe(false)
    expect(layoutNodeGrows({ type: 'Column', name: 'name' }, columns)).toBe(true)
    expect(layoutNodeGrows({ type: 'Stack', schema: [], grow: false }, columns)).toBe(false)
  })

  it('places record actions', () => {
    expect(recordActionsAtStart('before-cells')).toBe(true)
    expect(recordActionsAtStart('before-columns')).toBe(true)
    expect(recordActionsAtStart('after-cells')).toBe(false)
  })
})

describe('pagination modes', () => {
  const base = { perPage: 10, from: 1, to: 10, pageOptions: [10] }

  it('builds next and previous queries for each mode', () => {
    const numbered = { ...base, currentPage: 2, lastPage: 3, total: 25 }
    const simple = {
      ...base,
      mode: 'simple' as const,
      currentPage: 1,
      simple: true as const,
      hasMorePages: true,
    }
    const cursor = {
      ...base,
      mode: 'cursor' as const,
      hasMorePages: true,
      nextCursor: 'n',
      previousCursor: null,
    }
    const more = { ...base, mode: 'load-more' as const, currentPage: 2, hasMorePages: false }

    expect(nextPageQuery(numbered)).toEqual({ page: 3 })
    expect(previousPageQuery(numbered)).toEqual({ page: 1 })
    expect(nextPageQuery(simple)).toEqual({ page: 2 })
    expect(previousPageQuery(simple)).toBeNull()
    expect(nextPageQuery(cursor)).toEqual({ cursor: 'n' })
    expect(previousPageQuery(cursor)).toBeNull()
    expect(nextPageQuery(more)).toBeNull()
    expect(isAppendingPagination(more)).toBe(true)
    expect(paginationTotal(numbered)).toBe(25)
    expect(paginationTotal(simple)).toBeNull()
  })

  it('keeps the cursor out of the url when other state changes', () => {
    expect(buildTableUrl('/posts?cursor=abc&page=2', undefined, { cursor: 'next' })).toBe(
      '/posts?cursor=next&page=2',
    )
    expect(buildTableUrl('/posts?cursor=abc', undefined, { sort: 'title' })).toBe(
      '/posts?sort=title',
    )
  })
})

describe('column order', () => {
  it('moves a column and saves the order', async () => {
    expect(moveColumn(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b'])
    expect(moveColumn(['a', 'b'], 'a', -1)).toEqual(['a', 'b'])
    // Drag and drop: the dragged column takes the position of the one it is dropped on.
    expect(moveColumnTo(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b'])
    expect(moveColumnTo(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a'])
    expect(moveColumnTo(['a', 'b', 'c'], 'a', 'zz')).toEqual(['a', 'b', 'c'])

    await expect(saveColumnOrder('/columns', 't', 'table', ['b', 'a'])).resolves.toEqual(['b', 'a'])
    expect(jsonCalls[0]).toEqual({
      url: '/columns',
      body: { token: 't', component: 'table', columns: ['b', 'a'] },
    })
    expect(reloads[0]).toEqual({ only: ['page'] })

    // A table visit follows (Reset, Apply with visibility changes): no reload racing it.
    await saveColumnOrder('/columns', 't', 'table', [], { reload: false })
    expect(reloads).toHaveLength(1)
  })
})
