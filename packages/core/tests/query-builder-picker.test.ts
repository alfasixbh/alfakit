import {
  constraintPickerClasses,
  filterQueryBuilderOptions,
  queryBuilderInputType,
  queryBuilderOptions,
  remainingTextSizeClass,
} from '../src'

describe('query builder helpers', () => {
  it('builds constraint picker classes', () => {
    expect(
      constraintPickerClasses({ constraintPickerColumns: { default: 2, lg: 3 } }).grid,
    ).toContain('grid-cols-2')
    expect(
      constraintPickerClasses({ constraintPickerColumns: { default: 1 } }).grid,
    ).toBeUndefined()
    expect(constraintPickerClasses({ constraintPickerWidth: '2xl' }).width).toContain('w-2xl')
    expect(constraintPickerClasses({ constraintPickerWidth: 'bogus' }).width).toBeUndefined()
  })

  it('maps input kinds and options', () => {
    expect(queryBuilderInputType('datetime')).toBe('datetime-local')
    expect(queryBuilderInputType('year')).toBe('number')
    expect(queryBuilderInputType('month')).toBe('month')
    expect(queryBuilderInputType('custom')).toBe('text')

    const constraint = {
      name: 's',
      label: 'S',
      type: 'select',
      operators: [],
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ],
    }

    expect(queryBuilderOptions(constraint, undefined)).toHaveLength(2)
    expect(
      queryBuilderOptions(constraint, {
        name: 'x',
        label: 'x',
        input: 'select',
        options: [{ value: 'z', label: 'Zed' }],
      }),
    ).toEqual([{ value: 'z', label: 'Zed' }])
    expect(filterQueryBuilderOptions(constraint.options, ' ALP ')).toEqual([
      { value: 'a', label: 'Alpha' },
    ])
    expect(filterQueryBuilderOptions(constraint.options, '')).toHaveLength(2)
  })

  it('maps remaining text sizes', () => {
    expect(remainingTextSizeClass(undefined)).toBe('text-sm')
    expect(remainingTextSizeClass('lg')).toBe('text-lg')
    expect(remainingTextSizeClass('nope')).toBe('text-sm')
  })
})
