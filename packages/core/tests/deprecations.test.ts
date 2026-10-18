import { afterEach, describe, expect, it, vi } from 'vitest'
import { deprecate, deprecationMessage, reportedDeprecations, resetDeprecations } from '../src'

describe('deprecate()', () => {
  afterEach(() => {
    resetDeprecations()
    vi.restoreAllMocks()
  })

  it('warns once per key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(deprecate('old()', 'use new() instead', { since: '1.2' })).toBe(true)
    expect(deprecate('old()', 'use new() instead', { since: '1.2' })).toBe(false)
    expect(deprecate('old()', 'another message, same key')).toBe(false)
    expect(deprecate('other()', 'use something else')).toBe(true)

    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn).toHaveBeenNthCalledWith(
      1,
      'Alfakit: old() is deprecated since Alfakit 1.2: use new() instead',
    )
    expect(warn).toHaveBeenNthCalledWith(2, 'Alfakit: other() is deprecated: use something else')
  })

  it('lists what was reported and can be reset', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    deprecate('a', 'use b')
    deprecate('c', 'use d', { since: '2.0' })

    expect(reportedDeprecations()).toEqual([
      deprecationMessage('a', 'use b'),
      deprecationMessage('c', 'use d', { since: '2.0' }),
    ])

    resetDeprecations()

    expect(reportedDeprecations()).toEqual([])
    expect(deprecate('a', 'use b')).toBe(true)
  })
})
