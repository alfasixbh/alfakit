import type { TableRecordSchema } from '../src/schema/table'
import {
  ALL_SELECTED_RECORDS_ARGUMENT,
  SELECTED_RECORDS_ARGUMENT,
  TableSelection,
  buildTableUrl,
  canSelectAllRecords,
  filterSelectColumnOptions,
  filtersCollapsible,
  filtersFormWidthClass,
  filtersPlacement,
  optionText,
  searchTableColumnOptions,
  selectedRecordsArguments,
  stackedCellClasses,
} from '../src/table'

const record = (key: number, group?: string): TableRecordSchema => ({ key, cells: {}, group })

describe('selection limits', () => {
  it('stops at maxSelectableRecords and refuses "select all"', () => {
    const selection = new TableSelection()
    selection.configure({ maxSelectableRecords: 2 })

    selection.toggle(1, true)
    selection.toggle(2, true)
    selection.toggle(3, true)
    expect(selection.keys).toEqual(['1', '2'])
    expect(selection.isFull).toBe(true)
    expect(selection.canSelect(3)).toBe(false)
    expect(selection.canSelect(1)).toBe(true)

    selection.selectAll()
    expect(selection.state.allSelected).toBe(false)

    selection.clear()
    selection.selectPage([record(1), record(2), record(3)])
    expect(selection.keys).toEqual(['1', '2'])
  })

  it('keeps the selection within one group under selectGroupsOnly', () => {
    const selection = new TableSelection()
    selection.configure({ selectGroupsOnly: true })
    const records = [record(1, 'a'), record(2, 'a'), record(3, 'b')]

    selection.toggle(1, true, 'a')
    selection.toggle(2, true, 'a')
    expect(selection.keys).toEqual(['1', '2'])

    selection.toggle(3, true, 'b')
    expect(selection.keys).toEqual(['3'])
    expect(selection.state.group).toBe('b')

    selection.selectGroup('a', records)
    expect(selection.keys).toEqual(['1', '2'])
    expect(selection.groupState('a', records)).toBe(true)
    expect(selection.groupState('b', records)).toBe(false)

    selection.toggle(2, false, 'a')
    expect(selection.groupState('a', records)).toBe('indeterminate')

    selection.deselectGroup('a', records)
    expect(selection.keys).toEqual([])
    expect(selection.state.group).toBeUndefined()
  })

  it('offers "select all" only without limits', () => {
    expect(canSelectAllRecords({})).toBe(true)
    expect(canSelectAllRecords({ maxSelectableRecords: 5 })).toBe(false)
    expect(canSelectAllRecords({ selectGroupsOnly: true })).toBe(false)
    expect(canSelectAllRecords({ selectCurrentPageOnly: true })).toBe(false)
  })
})

describe('accessSelectedRecords arguments', () => {
  it('sends the selection only to actions that ask for it', () => {
    const state = { selected: new Set(['4', '5']), allSelected: false }
    const plain = [{ type: 'Action', name: 'edit', label: 'Edit' }] as never
    const access = [
      {
        type: 'ActionGroup',
        actions: [{ type: 'Action', name: 'copy', label: 'Copy', accessSelectedRecords: true }],
      },
    ] as never

    expect(selectedRecordsArguments(state, plain)).toBeUndefined()
    expect(selectedRecordsArguments(state, access)).toEqual({
      [SELECTED_RECORDS_ARGUMENT]: ['4', '5'],
    })
    expect(selectedRecordsArguments({ selected: new Set(), allSelected: true }, access)).toEqual({
      [ALL_SELECTED_RECORDS_ARGUMENT]: true,
    })
  })
})

describe('persisted columns', () => {
  it('sends an empty key when every toggleable column is hidden', () => {
    const url = buildTableUrl('/admin/posts?columns[0]=title', undefined, { columns: [] }, [
      'columns',
    ])

    expect(url).toBe('/admin/posts?columns=')
    expect(buildTableUrl('/admin/posts?columns[0]=title', undefined, { columns: [] })).toBe(
      '/admin/posts',
    )
  })

  it('clears persisted records per page with an empty key', () => {
    expect(
      buildTableUrl('/admin/posts?perPage=50', undefined, { perPage: null }, ['perPage']),
    ).toBe('/admin/posts?perPage=')
  })
})

describe('select column options', () => {
  const options = [
    { value: '1', label: '<b>Ada</b> Lovelace' },
    { value: '2', label: 'Alan Turing' },
    { value: '3', label: 'Grace Hopper' },
  ]

  it('filters by label text, leaves the record out and caps the list', () => {
    expect(filterSelectColumnOptions(options, {}, 'lov').map((o) => o.value)).toEqual(['1'])
    expect(filterSelectColumnOptions(options, {}, 'b').map((o) => o.value)).toEqual([])
    expect(
      filterSelectColumnOptions(options, { ignoreRecord: true }, '', 2).map((o) => o.value),
    ).toEqual(['1', '3'])
    expect(filterSelectColumnOptions(options, { optionsLimit: 2 }, '')).toHaveLength(2)
    expect(optionText('<b>Ada</b>  Lovelace')).toBe('Ada Lovelace')
  })

  it('searches remote options through the filters schema', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ options: [{ value: '7', label: 'Ada' }] }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await searchTableColumnOptions(
      '/_alfakit/schema/options',
      'tok',
      'table',
      { optionsSearchPath: '__columnOptions.author_id' },
      'ad',
    )

    expect(result).toEqual([{ value: '7', label: 'Ada' }])
    const url = String((fetchMock.mock.calls[0] as unknown[])[0])
    expect(url).toContain('component=table.filters')
    expect(url).toContain('path=__columnOptions.author_id')
    expect(url).toContain('search=ad')
    vi.unstubAllGlobals()
  })
})

describe('filter layouts', () => {
  it('places sidebar layouts and resolves widths', () => {
    expect(filtersPlacement('before-content-collapsible')).toBe('before')
    expect(filtersPlacement('after-content')).toBe('after')
    expect(filtersPlacement('above-content-collapsible')).toBe('above')
    expect(filtersPlacement('dropdown')).toBe('toolbar')
    expect(filtersCollapsible('after-content-collapsible')).toBe(true)
    expect(filtersCollapsible('after-content')).toBe(false)
    expect(filtersFormWidthClass({ filtersLayout: 'dropdown', filtersFormWidth: 'lg' })).toBe(
      'sm:w-lg',
    )
    expect(filtersFormWidthClass({ filtersLayout: 'before-content', filtersFormWidth: 'sm' })).toBe(
      'lg:w-sm',
    )
    expect(filtersFormWidthClass({ filtersLayout: 'modal', filtersFormWidth: '3xl' })).toBe(
      'sm:max-w-3xl',
    )
    expect(filtersFormWidthClass({ filtersLayout: 'dropdown' })).toBeUndefined()
  })

  it('keeps responsive column visibility in stacked cells', () => {
    expect(stackedCellClasses({})).toContain('max-md:flex')
    expect(stackedCellClasses({ visibleFrom: 'lg' })).not.toContain('max-md:flex')
  })
})
