import type { NavigationGroupSchema, TableSchema } from '../src'
import {
  bottomNavigationItems,
  hasMobilePreset,
  isNavigationItemActive,
  mobileCardLayout,
  mobileTable,
  navigationItemUrl,
} from '../src/mobile'

const navigation: NavigationGroupSchema[] = [
  {
    collapsible: false,
    items: [
      { label: 'Dashboard', url: '/admin', icon: 'home', active: true },
      { label: 'Orders', url: '/admin/orders' },
    ],
  },
  {
    label: 'Catalogue',
    collapsible: true,
    items: [
      { label: 'Products', url: '/admin/products' },
      { label: 'Categories', url: '/admin/categories' },
      {
        label: 'Settings',
        children: [{ label: 'General', url: '/admin/settings/general', active: false }],
      },
    ],
  },
]

const table: TableSchema = {
  type: 'Table',
  modelLabel: 'user',
  pluralModelLabel: 'users',
  columns: [
    { type: 'TextColumn', name: 'name', label: 'Name' },
    { type: 'TextColumn', name: 'email', label: 'Email' },
  ],
  visibleColumns: ['name', 'email'],
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [],
  pagination: null,
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  emptyState: { heading: 'No users', icon: 'inbox' },
}

const preset = { theme: { design: { mobile: 'bottom' } } } as never

describe('hasMobilePreset', () => {
  it('is on only for the bottom mobile design', () => {
    expect(hasMobilePreset(preset)).toBe(true)
    expect(hasMobilePreset({ theme: { design: { mobile: 'drawer' } } } as never)).toBe(false)
    expect(hasMobilePreset({ theme: { design: {} } } as never)).toBe(false)
    expect(hasMobilePreset(undefined)).toBe(false)
  })
})

describe('bottomNavigationItems', () => {
  it('flattens groups into top-level items and keeps everything when it fits', () => {
    const { primary, overflow } = bottomNavigationItems(navigation.slice(0, 1))

    expect(primary.map((item) => item.label)).toEqual(['Dashboard', 'Orders'])
    expect(overflow).toEqual([])
  })

  it('reserves the last slot for "More" when there are more items than slots', () => {
    const { primary, overflow } = bottomNavigationItems(navigation)

    expect(primary.map((item) => item.label)).toEqual(['Dashboard', 'Orders', 'Products'])
    expect(overflow.map((item) => item.label)).toEqual(['Categories', 'Settings'])
  })

  it('respects a custom slot count and handles empty navigation', () => {
    expect(bottomNavigationItems(navigation, 2).primary.map((item) => item.label)).toEqual([
      'Dashboard',
    ])
    expect(bottomNavigationItems(undefined)).toEqual({ primary: [], overflow: [] })
  })

  it('links parents without a URL to their first child and marks active parents', () => {
    const settings = navigation[1]!.items[2]!

    expect(navigationItemUrl(settings)).toBe('/admin/settings/general')
    expect(isNavigationItemActive(settings)).toBe(false)
    expect(isNavigationItemActive({ label: 'x', children: [{ label: 'y', active: true }] })).toBe(
      true,
    )
  })
})

describe('mobileTable', () => {
  it('stacks the visible columns on a phone under the preset', () => {
    const result = mobileTable(table, table.columns, { isMobile: true, panel: preset })

    expect(result.contentLayout).toEqual(mobileCardLayout(table.columns))
    expect(result.contentLayout).toEqual([
      {
        type: 'Stack',
        space: 1,
        schema: [
          { type: 'Column', name: 'name' },
          { type: 'Column', name: 'email' },
        ],
      },
    ])
  })

  it('leaves the table alone on desktop, without the preset, or when it has a layout', () => {
    expect(mobileTable(table, table.columns, { isMobile: false, panel: preset })).toBe(table)
    expect(mobileTable(table, table.columns, { isMobile: true, panel: undefined })).toBe(table)

    const custom: TableSchema = {
      ...table,
      contentLayout: [{ type: 'Split', schema: [{ type: 'Column', name: 'name' }] }],
    }

    expect(mobileTable(custom, custom.columns, { isMobile: true, panel: preset })).toBe(custom)
  })
})
