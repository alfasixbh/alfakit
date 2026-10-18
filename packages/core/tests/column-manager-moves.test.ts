import {
  columnManagerPosition,
  columnOrderChanged,
  constraintPickerSections,
  moveColumnInManager,
  orderColumnsBy,
} from '../src'

const groups = [{ label: 'Contact', columns: ['email', 'phone'] }]
const order = ['name', 'email', 'phone', 'notes']

describe('column manager moves', () => {
  it('counts a column group as one top-level item', () => {
    expect(columnManagerPosition(order, 'name', groups)).toEqual({ position: 1, count: 3 })
    expect(columnManagerPosition(order, 'notes', groups)).toEqual({ position: 3, count: 3 })
    expect(columnManagerPosition(order, 'phone', groups)).toEqual({
      position: 2,
      count: 2,
      group: 'Contact',
    })
  })

  it('moves grouped columns inside their group and others past whole groups', () => {
    expect(moveColumnInManager(order, 'phone', -1, groups)).toEqual([
      'name',
      'phone',
      'email',
      'notes',
    ])
    expect(moveColumnInManager(order, 'email', -1, groups)).toEqual(order)
    expect(moveColumnInManager(order, 'name', 1, groups)).toEqual([
      'email',
      'phone',
      'name',
      'notes',
    ])
    expect(moveColumnInManager(order, 'notes', -1, groups)).toEqual([
      'name',
      'notes',
      'email',
      'phone',
    ])
    expect(moveColumnInManager(order, 'notes', 1)).toEqual(order)
  })

  it('orders columns by a draft and detects changes', () => {
    const columns = order.map((name) => ({ name }))

    expect(orderColumnsBy(columns, ['phone', 'name']).map((c) => c.name)).toEqual([
      'phone',
      'name',
      'email',
      'notes',
    ])
    expect(columnOrderChanged(order, [...order])).toBe(false)
    expect(columnOrderChanged(order, ['email', 'name', 'phone', 'notes'])).toBe(true)
  })
})

describe('constraint picker sections', () => {
  it('puts ungrouped constraints first, then groups in order of appearance', () => {
    const constraint = (name: string, group?: string) => ({
      name,
      label: name,
      type: 'text',
      operators: [],
      ...(group ? { group } : {}),
    })

    expect(
      constraintPickerSections([
        constraint('title', 'Content'),
        constraint('status'),
        constraint('rating', 'Numbers'),
        constraint('body', 'Content'),
      ]).map((section) => [section.label, section.constraints.map((c) => c.name)]),
    ).toEqual([
      [undefined, ['status']],
      ['Content', ['title', 'body']],
      ['Numbers', ['rating']],
    ])
  })
})
