import { describe, expect, it } from 'vitest'
import { contentGridClasses } from '../src/utils/container-breakpoints'

describe('contentGridClasses', () => {
  it('is one column without a grid', () => {
    expect(contentGridClasses(undefined)).toBe('grid-cols-1')
    expect(contentGridClasses({})).toBe('grid-cols-1')
  })

  it('follows the table width instead of the viewport', () => {
    // `md` alone would be @sm (24rem), but two 15rem cards need @xl (36rem).
    expect(contentGridClasses({ md: 2, xl: 3 })).toBe(
      'grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3',
    )
    expect(contentGridClasses({ lg: 2 })).toBe('grid-cols-1 @xl:grid-cols-2')
    expect(contentGridClasses({ '2xl': 4 })).toBe('grid-cols-1 @6xl:grid-cols-4')
    expect(contentGridClasses({ md: 2, xl: 3 })).not.toMatch(/(^| )(md|xl):grid-cols/)
  })

  it('never uses a column count below the width that keeps cards 15rem wide', () => {
    expect(contentGridClasses({ default: 2 })).toBe('grid-cols-1 @xl:grid-cols-2')
    expect(contentGridClasses({ sm: 3 })).toBe('grid-cols-1 @4xl:grid-cols-3')
    expect(contentGridClasses({ md: 4 })).toBe('grid-cols-1 @6xl:grid-cols-4')
    expect(contentGridClasses({ default: 1, md: 6 })).toBe('grid-cols-1 @7xl:grid-cols-6')
  })

  it('lets the wider key win on the same container size and keeps container keys', () => {
    expect(contentGridClasses({ sm: 2, md: 2 })).toBe('grid-cols-1 @xl:grid-cols-2')
    expect(contentGridClasses({ xl: 5, '2xl': 6 })).toBe('grid-cols-1 @7xl:grid-cols-6')
    expect(contentGridClasses({ '@md': 2, '@3xl': 3 })).toBe(
      'grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3',
    )
  })
})
