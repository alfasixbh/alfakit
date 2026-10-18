import { describe, expect, it } from 'vitest'
import {
  beginTableLoading,
  columnDraftChanged,
  endTableLoading,
  extremePageLinks,
  isTableLoading,
  limitedListItems,
  removeAllFilterIndicators,
  removeFilterIndicator,
  skeletonRowCount,
  stackedImageStyle,
  tableLoadingStore,
  toggleVisibleColumn,
  triggerButtonView,
} from '../src'

describe('triggerButtonView', () => {
  it('uses the defaults when the button was not customised', () => {
    expect(triggerButtonView({}, 'filters', { label: 'Filters', badge: 2 })).toEqual({
      label: 'Filters',
      showLabel: true,
      iconAfter: false,
      variant: 'outline',
      size: 'sm',
      badge: 2,
      disabled: false,
    })
  })

  it('maps the server action to a button', () => {
    const table = {
      triggerActions: {
        filters: { label: 'Filter', variant: 'button' as const, icon: 'funnel', color: 'primary' },
        columnManager: { label: 'Columns', variant: 'icon-button' as const },
        groupRecords: { hidden: true },
        filtersApply: { label: 'Save', variant: 'link' as const, color: 'gray' },
      },
    }

    expect(triggerButtonView(table, 'filters', { label: 'Filters', badge: 1 })).toMatchObject({
      label: 'Filter',
      showLabel: true,
      variant: 'default',
      icon: 'funnel',
      color: 'primary',
      badge: 1,
    })
    expect(triggerButtonView(table, 'columnManager', { label: 'x' })).toMatchObject({
      showLabel: false,
      variant: 'ghost',
    })
    expect(triggerButtonView(table, 'groupRecords', { label: 'x' })).toBeNull()
    expect(triggerButtonView(table, 'filtersApply', { label: 'x' })).toMatchObject({
      variant: 'link',
      color: undefined,
    })
  })
})

describe('table toolbar helpers', () => {
  it('tracks in-flight table visits per identifier', () => {
    beginTableLoading('posts')
    expect(isTableLoading(tableLoadingStore.get(), 'posts')).toBe(true)
    expect(isTableLoading(tableLoadingStore.get(), undefined)).toBe(false)
    endTableLoading('posts')
    endTableLoading('posts')
    expect(isTableLoading(tableLoadingStore.get(), 'posts')).toBe(false)
    expect(skeletonRowCount([])).toBe(3)
    expect(skeletonRowCount(Array.from({ length: 25 }))).toBe(10)
  })

  it('computes extreme page links', () => {
    expect(extremePageLinks({}, 2, 5)).toBeNull()
    expect(extremePageLinks({ extremePaginationLinks: true }, 1, 5)).toEqual({
      first: null,
      last: 5,
    })
    expect(extremePageLinks({ extremePaginationLinks: true }, 5, 5)).toEqual({
      first: 1,
      last: null,
    })
  })

  it('limits expandable lists', () => {
    const schema = { expandableLimitedList: true, listLimit: 2 }

    expect(limitedListItems(['a', 'b', 'c'], schema, false)).toEqual({
      items: ['a', 'b'],
      hidden: 1,
    })
    expect(limitedListItems(['a', 'b', 'c'], schema, true)).toEqual({
      items: ['a', 'b', 'c'],
      hidden: 0,
    })
    expect(limitedListItems(['a', 'b', 'c'], { listLimit: 1 }, false).hidden).toBe(0)
  })

  it('styles stacked images with ring and overlap', () => {
    expect(stackedImageStyle(1, { stacked: true })).toBeUndefined()
    expect(stackedImageStyle(0, { stacked: true, ring: 4 })).toEqual({
      boxShadow: '0 0 0 4px var(--background)',
      marginInlineStart: '0',
    })
    expect(stackedImageStyle(2, { stacked: true, ring: 0, overlap: 4 })).toEqual({
      boxShadow: 'none',
      marginInlineStart: '-1rem',
    })
  })

  it('removes filter indicators by field or whole filter', () => {
    const state = { created: { from: '2026-01-01', until: '2026-02-01' }, status: { value: 'x' } }

    expect(
      removeFilterIndicator(state, { filter: 'created', label: 'From', removeField: 'from' }),
    ).toEqual({
      created: { from: null, until: '2026-02-01' },
      status: { value: 'x' },
    })
    expect(removeFilterIndicator(state, { filter: 'status', label: 'S' })).toEqual({
      created: state.created,
    })
    expect(
      removeAllFilterIndicators(state, [
        { filter: 'created', label: 'Locked', removable: false },
        { filter: 'status', label: 'S' },
      ]),
    ).toEqual({ created: state.created })
  })

  it('toggles draft columns', () => {
    expect(toggleVisibleColumn(['a', 'b'], 'a')).toEqual(['b'])
    expect(toggleVisibleColumn(['b'], 'a')).toEqual(['b', 'a'])
    expect(columnDraftChanged(['a', 'b'], ['b', 'a'])).toBe(false)
    expect(columnDraftChanged(['a'], ['a', 'b'])).toBe(true)
  })
})
