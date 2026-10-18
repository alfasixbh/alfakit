import { afterEach, describe, expect, it } from 'vitest'
import type { TableRecordSchema, TableSchema } from '../src'
import {
  buildTableUrl,
  groupTableRows,
  initialCollapsedGroups,
  registerTablePersistence,
  toggleCollapsedGroup,
} from '../src'

const record = (key: number, group?: string): TableRecordSchema => ({ key, cells: {}, group })

const grouped: Pick<TableSchema, 'grouping' | 'recordGroups'> = {
  grouping: { group: 'status', label: 'Status', direction: 'asc', collapsible: true },
  recordGroups: [
    { key: 'draft', title: 'Status: draft', summary: { rating: [{ label: 'Sum', value: '4' }] } },
    { key: '', title: 'Status: No value' },
  ],
}

describe('groupTableRows', () => {
  it('returns plain records for ungrouped tables', () => {
    const rows = groupTableRows({}, [record(1), record(2)], new Set())

    expect(rows.map((row) => row.kind)).toEqual(['record', 'record'])
  })

  it('interleaves group headings, records and group summaries', () => {
    const rows = groupTableRows(
      grouped,
      [record(1, 'draft'), record(2, 'draft'), record(3, '')],
      new Set(),
    )

    expect(rows.map((row) => (row.kind === 'record' ? row.record.key : row.kind))).toEqual([
      'group',
      1,
      2,
      'summary',
      'group',
      3,
    ])
    expect(rows[0]).toMatchObject({ kind: 'group', count: 2, collapsed: false })
    expect(rows[5]).toMatchObject({ kind: 'record', index: 2 })
  })

  it('leaves out the records and summary of collapsed groups', () => {
    const rows = groupTableRows(grouped, [record(1, 'draft'), record(3, '')], new Set(['draft']))

    expect(rows.map((row) => row.kind)).toEqual(['group', 'group', 'record'])
    expect(rows[0]).toMatchObject({ collapsed: true, count: 1 })
  })

  it('shows every group with its summary for groups-only tables', () => {
    const rows = groupTableRows(
      { ...grouped, grouping: { ...grouped.grouping!, groupsOnly: true } },
      [],
      new Set(['draft']),
    )

    expect(rows.map((row) => row.kind)).toEqual(['group', 'summary', 'group'])
  })

  it('collapses every group by default when asked', () => {
    expect(initialCollapsedGroups(grouped).size).toBe(0)
    expect([
      ...initialCollapsedGroups({
        ...grouped,
        grouping: { ...grouped.grouping!, collapsedByDefault: true },
      }),
    ]).toEqual(['draft', ''])
    expect([...toggleCollapsedGroup(new Set(['a']), 'a')]).toEqual([])
    expect([...toggleCollapsedGroup(new Set(), 'a')]).toEqual(['a'])
  })
})

describe('buildTableUrl', () => {
  afterEach(() => registerTablePersistence(undefined, undefined))

  it('serialises nested filter state as bracket parameters', () => {
    const url = buildTableUrl('/posts', undefined, {
      filters: {
        queryBuilder: {
          query: {
            combinator: 'or',
            rules: [
              { type: 'constraint', constraint: 'title', operator: 'contains', value: 'news' },
              {
                type: 'group',
                combinator: 'and',
                rules: [
                  { type: 'constraint', constraint: 'status', operator: 'is', value: ['a', 'b'] },
                ],
              },
            ],
          },
        },
      },
    })

    const params = new URL(url, 'http://localhost').searchParams

    expect(params.get('filters[queryBuilder][query][combinator]')).toBe('or')
    expect(params.get('filters[queryBuilder][query][rules][0][value]')).toBe('news')
    expect(params.get('filters[queryBuilder][query][rules][1][rules][0][value][1]')).toBe('b')
  })

  it('sets and clears the group, keeping an explicit empty group', () => {
    expect(
      buildTableUrl('/posts?posts_page=2', 'posts', { group: 'status', groupDirection: 'desc' }),
    ).toBe('/posts?posts_groupDirection=desc&posts_group=status')
    expect(buildTableUrl('/posts?group=status', undefined, { group: '' })).toBe('/posts?group=')
    expect(buildTableUrl('/posts?group=status', undefined, { group: null })).toBe('/posts')
  })

  it('sends cleared persisted keys as empty values', () => {
    registerTablePersistence(undefined, ['search', 'filters'])

    expect(buildTableUrl('/posts?search=a', undefined, { search: null })).toBe('/posts?search=')
    expect(buildTableUrl('/posts?filters[a][value]=1', undefined, { filters: null })).toBe(
      '/posts?filters=',
    )
    // Keys that are not persisted are still removed.
    expect(buildTableUrl('/posts?columnSearch[a]=x', undefined, { columnSearch: {} })).toBe(
      '/posts',
    )

    const cleanup = registerTablePersistence('other', ['sort'])
    expect(buildTableUrl('/posts?other_sort=a', 'other', { sort: null })).toBe('/posts?other_sort=')
    cleanup()
    expect(buildTableUrl('/posts?other_sort=a', 'other', { sort: null })).toBe('/posts')
  })
})
