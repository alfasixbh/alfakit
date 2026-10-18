import { extraProps } from '../src/lib/attributes'

describe('extraProps', () => {
  it('merges PHP classes with the component classes', () => {
    expect(
      extraProps({ class: 'bg-primary/5 border-primary', id: 'x' }, 'rounded-xl border'),
    ).toEqual({
      id: 'x',
      class: 'rounded-xl border bg-primary/5 border-primary',
    })
  })

  it('lets PHP classes win Tailwind conflicts and keeps other attributes', () => {
    expect(extraProps({ class: 'p-2', style: 'color: red', for: 'name' }, 'p-6')).toEqual({
      class: 'p-2',
      style: 'color: red',
      for: 'name',
    })
    expect(extraProps(undefined)).toEqual({ class: undefined })
  })
})
