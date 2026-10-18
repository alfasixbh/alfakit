import type { CellSchema, ColumnSchema } from '@alfakit/core'
import { render } from '@testing-library/svelte'
import ColorCell from '../src/components/table/ColorCell.svelte'
import { navigationKey, uniqueKey, valueKey } from '../src/lib/keys'

describe('uniqueKey', () => {
  it('keeps natural keys and suffixes repeats', () => {
    const colors = ['#f00', '#0f0', '#f00', '#f00']
    const keys = colors.map((_, index) => uniqueKey(colors, index, valueKey))

    expect(keys[0]).toBe('#f00')
    expect(keys[1]).toBe('#0f0')
    expect(new Set(keys).size).toBe(colors.length)
  })

  it('distinguishes navigation items by url and label', () => {
    const items = [
      { label: 'Orders', url: '/a' },
      { label: 'Orders', url: '/b' },
      { label: 'Orders', url: '/a' },
    ]
    const keys = items.map((_, index) => uniqueKey(items, index, navigationKey))

    expect(new Set(keys).size).toBe(3)
  })
})

describe('duplicate list keys', () => {
  it('renders the same colour twice in a ColorCell', () => {
    const { container } = render(ColorCell, {
      props: {
        cell: { state: ['#ff0000', '#ff0000', '#00ff00'] } as unknown as CellSchema,
        column: { name: 'colors' } as ColumnSchema,
        recordKey: 1,
        token: 't',
        component: 'c',
      },
    })

    expect(container.querySelectorAll('span[title="#ff0000"]')).toHaveLength(2)
  })
})
