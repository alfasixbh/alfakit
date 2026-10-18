import type { TableRecordSchema } from '../src/schema'
import { TableSelection } from '../src/table'
import {
  ariaSort,
  fieldAria,
  fieldIds,
  logicalArrowKey,
  moveListItem,
  pageSelectionState,
  primaryColumnName,
  reorderOffset,
  selectAllState,
  withoutRequired,
} from '../src/utils/a11y'

describe('field aria attributes', () => {
  it('derives stable ids from the control id', () => {
    expect(fieldIds('alfakit-email')).toEqual({
      label: 'alfakit-email-label',
      hint: 'alfakit-email-hint',
      helper: 'alfakit-email-helper',
      error: 'alfakit-email-error',
    })
  })

  it('only references descriptions that are rendered', () => {
    expect(fieldAria('name', {})).toEqual({})
    expect(fieldAria('name', { helperText: 'Shown publicly' })).toEqual({
      'aria-describedby': 'name-helper',
    })
    expect(
      fieldAria('name', { hint: 'Max 20', helperText: 'Shown publicly', required: true }, 'Taken'),
    ).toEqual({
      'aria-describedby': 'name-hint name-helper name-error',
      'aria-invalid': true,
      'aria-required': true,
    })
  })

  it('drops aria-required for roles that do not support it', () => {
    expect(withoutRequired({ 'aria-required': true, 'aria-invalid': true })).toEqual({
      'aria-invalid': true,
    })
  })
})

describe('keyboard helpers', () => {
  it('flips horizontal arrows in RTL', () => {
    expect(logicalArrowKey('ArrowLeft', 'ltr')).toBe('ArrowLeft')
    expect(logicalArrowKey('ArrowLeft', 'rtl')).toBe('ArrowRight')
    expect(logicalArrowKey('ArrowRight', 'rtl')).toBe('ArrowLeft')
    expect(logicalArrowKey('ArrowUp', 'rtl')).toBe('ArrowUp')
  })

  it('reads Alt + arrow as a move, following the reading direction', () => {
    expect(reorderOffset({ key: 'ArrowRight', altKey: true }, 'horizontal', 'ltr')).toBe(1)
    expect(reorderOffset({ key: 'ArrowRight', altKey: true }, 'horizontal', 'rtl')).toBe(-1)
    expect(reorderOffset({ key: 'ArrowLeft', altKey: true }, 'horizontal', 'rtl')).toBe(1)
    expect(reorderOffset({ key: 'ArrowUp', altKey: true }, 'vertical')).toBe(-1)
    expect(reorderOffset({ key: 'ArrowRight' }, 'horizontal')).toBeNull()
    expect(reorderOffset({ key: 'ArrowRight', altKey: true, metaKey: true }, 'horizontal')).toBe(
      null,
    )
  })

  it('moves list items', () => {
    expect(moveListItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveListItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b'])

    const items = ['a', 'b']
    expect(moveListItem(items, 0, 5)).toBe(items)
  })
})

describe('table helpers', () => {
  it('maps the sort state to aria-sort', () => {
    expect(ariaSort('name', 'name', 'asc')).toBe('ascending')
    expect(ariaSort('name', 'name', 'desc')).toBe('descending')
    expect(ariaSort('email', 'name', 'asc')).toBe('none')
    expect(ariaSort('name', null, null)).toBe('none')
  })

  it('reports an indeterminate "select page" state', () => {
    expect(selectAllState(0, 3)).toBe(false)
    expect(selectAllState(2, 3)).toBe('indeterminate')
    expect(selectAllState(3, 3)).toBe(true)
    expect(selectAllState(0, 0)).toBe(false)

    const records = [{ key: 1 }, { key: 2 }, { key: 3, selectable: false }] as TableRecordSchema[]
    const selection = new TableSelection()

    expect(pageSelectionState(selection, records)).toBe(false)
    selection.toggle(1, true)
    expect(pageSelectionState(selection, records)).toBe('indeterminate')
    selection.toggle(2, true)
    expect(pageSelectionState(selection, records)).toBe(true)
    selection.clear()
    selection.selectAll()
    expect(pageSelectionState(selection, records)).toBe(true)
  })

  it('picks the first column without its own control for the row link', () => {
    expect(
      primaryColumnName([
        { name: 'active', type: 'ToggleColumn' },
        { name: 'name', type: 'TextColumn' },
      ]),
    ).toBe('name')
    expect(
      primaryColumnName([
        { name: 'sku', type: 'TextColumn', copyable: true },
        { name: 'name', type: 'TextColumn' },
      ]),
    ).toBe('name')
    expect(primaryColumnName([{ name: 'title', type: 'TextInputColumn' }])).toBeNull()
  })
})
