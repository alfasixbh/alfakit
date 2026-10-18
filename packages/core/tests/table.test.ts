import { buildTableUrl, isPageFullySelected, tableQueryKey, TableSelection } from '../src/table'

describe('table query urls', () => {
  it('prefixes keys with the identifier', () => {
    expect(tableQueryKey(undefined, 'sort')).toBe('sort')
    expect(tableQueryKey('posts', 'sort')).toBe('posts_sort')
  })

  it('merges changes into the current url and resets the page', () => {
    const url = buildTableUrl('http://localhost/admin/posts?page=3&search=old', undefined, {
      sort: 'title',
      direction: 'desc',
    })

    expect(url).toBe('/admin/posts?search=old&sort=title&direction=desc')
  })

  it('serialises filters, column searches and toggled columns', () => {
    const url = buildTableUrl('/admin/posts', 'posts', {
      filters: {
        category_id: { value: '2' },
        tags: { values: ['a', 'b'] },
        empty: { value: null },
      },
      columnSearch: { title: 'he' },
      columns: ['title', 'status'],
    })

    const params = new URLSearchParams(url.split('?')[1])

    expect(params.get('posts_filters[category_id][value]')).toBe('2')
    expect(params.get('posts_filters[tags][values][1]')).toBe('b')
    expect(params.has('posts_filters[empty][value]')).toBe(false)
    expect(params.get('posts_columnSearch[title]')).toBe('he')
    expect(params.get('posts_columns[1]')).toBe('status')
  })

  it('removes keys when set to null and keeps page changes', () => {
    expect(buildTableUrl('/x?search=a&sort=b', undefined, { search: null })).toBe('/x?sort=b')
    expect(buildTableUrl('/x?search=a', undefined, { page: 2 })).toBe('/x?search=a&page=2')
    expect(buildTableUrl('/x?search=a&page=2', undefined, { page: 1 })).toBe('/x?search=a')
  })
})

describe('table selection', () => {
  const records = [
    { key: 1, cells: {} },
    { key: 2, cells: {} },
    { key: 3, cells: {}, selectable: false },
  ]

  it('toggles, selects pages and tracks all-selected', () => {
    const selection = new TableSelection()

    selection.toggle(1)
    expect(selection.isSelected('1')).toBe(true)
    expect(selection.count).toBe(1)

    selection.selectPage(records)
    expect(selection.keys).toEqual(['1', '2'])
    expect(isPageFullySelected(selection, records)).toBe(true)

    selection.deselectPage(records)
    expect(selection.count).toBe(0)

    selection.selectAll()
    expect(selection.isSelected(99)).toBe(true)

    selection.clear()
    expect(selection.state.allSelected).toBe(false)
  })
})

describe('TableSelection.syncScope', () => {
  it('clears the selection when the filter scope changes', () => {
    const selection = new TableSelection()
    selection.syncScope('a')
    selection.toggle(1)
    selection.syncScope('a')

    expect(selection.keys).toEqual(['1'])

    selection.syncScope('b')
    expect(selection.keys).toEqual([])

    selection.selectAll()
    selection.syncScope('c')
    expect(selection.state.allSelected).toBe(false)
  })

  it('keeps the selection without a scope (deselectAllRecordsWhenFiltered(false))', () => {
    const selection = new TableSelection()
    selection.syncScope(undefined)
    selection.toggle(1)
    selection.syncScope(undefined)

    expect(selection.keys).toEqual(['1'])
  })
})
