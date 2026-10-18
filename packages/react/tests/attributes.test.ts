import { describe, expect, it } from 'vitest'
import { extraProps, parseStyle } from '../src/lib/attributes'

describe('extraProps', () => {
  it('merges PHP classes with the component classes', () => {
    expect(
      extraProps({ class: 'bg-primary/5 border-primary', id: 'x' }, 'rounded-xl border'),
    ).toEqual({
      id: 'x',
      className: 'rounded-xl border bg-primary/5 border-primary',
    })
  })

  it('turns style strings into style objects and for into htmlFor', () => {
    expect(extraProps({ style: 'background-color: red; --gap: 2px', for: 'name' })).toEqual({
      className: undefined,
      htmlFor: 'name',
      style: { backgroundColor: 'red', '--gap': '2px' },
    })
    expect(parseStyle('color:blue;;  ')).toEqual({ color: 'blue' })
  })

  it('renames HTML attributes React spells differently, e.g. tabindex from PHP', () => {
    expect(extraProps({ tabindex: 1, readonly: true, 'data-x': 'y' })).toEqual({
      tabIndex: 1,
      readOnly: true,
      'data-x': 'y',
      className: undefined,
    })
  })
})
