import { describe, expect, it } from 'vitest'
import {
  contentGridClasses,
  recordColumnSpanClasses,
  recordGridColumnsClasses,
} from '../src/utils/container-breakpoints'

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

describe('record layout classes', () => {
  it('reads a Grid inside a table record against the record width', () => {
    expect(recordGridColumnsClasses(undefined)).toBe('grid-cols-1')
    expect(recordGridColumnsClasses({ default: 1, md: 2 })).toBe('grid-cols-1 @xs:grid-cols-2')
    expect(recordGridColumnsClasses({ md: 2, xl: 3 })).toBe(
      'grid-cols-1 @xs:grid-cols-2 @xl:grid-cols-3',
    )
    expect(recordGridColumnsClasses({ default: 2, lg: 4 })).toBe('grid-cols-2 @md:grid-cols-4')
    expect(recordGridColumnsClasses({ md: 2 })).not.toMatch(/(^| )md:/)
  })

  it('keeps container keys, which win over a viewport key on the same size', () => {
    expect(recordGridColumnsClasses({ '@sm': 3 })).toBe('grid-cols-1 @sm:grid-cols-3')
    expect(recordGridColumnsClasses({ md: 2, '@xs': 4 })).toBe('grid-cols-1 @xs:grid-cols-4')
  })

  it('maps column spans and starts the same way', () => {
    expect(recordColumnSpanClasses(undefined)).toBe('')
    expect(recordColumnSpanClasses({ default: 'full', md: 1 }, { lg: 2 })).toBe(
      'col-span-full @xs:col-span-1 @md:col-start-2',
    )
  })
})
