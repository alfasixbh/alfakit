import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  inspectableProps,
  jsonEntries,
  jsonKind,
  jsonScalar,
  latestServerTiming,
  prettyJson,
  searchJson,
} from '../src/dev-tools'

describe('schema inspector helpers', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('walks objects and arrays with dotted paths', () => {
    expect(jsonEntries({ page: { content: [{ type: 'form' }] } }, '')).toEqual([
      { key: 'page', path: 'page', value: { content: [{ type: 'form' }] }, kind: 'object' },
    ])
    expect(jsonEntries([1, 'a'], 'list').map((entry) => [entry.path, entry.kind])).toEqual([
      ['list.0', 'number'],
      ['list.1', 'string'],
    ])
    expect(jsonKind(null)).toBe('null')
    expect(jsonScalar('x')).toBe('"x"')
  })

  it('finds keys and values and keeps their ancestors visible', () => {
    const result = searchJson(
      { page: { content: [{ type: 'TextInput', name: 'title' }] } },
      'textinput',
    )

    expect([...result.matches]).toEqual(['page.content.0.type'])
    expect([...result.visible].sort()).toEqual([
      'page',
      'page.content',
      'page.content.0',
      'page.content.0.type',
    ])
    expect(searchJson({ a: 1 }, '  ').visible.size).toBe(0)
  })

  it('leaves its own data out of the inspected props', () => {
    expect(inspectableProps({ page: {}, alfakitDevTools: {}, alfakitDebug: {} })).toEqual({
      page: {},
    })
    expect(prettyJson({ a: 1 })).toBe('{\n  "a": 1\n}')
  })

  it('reads the latest AlfaKit server timing from the Performance API', () => {
    vi.stubGlobal('performance', {
      getEntriesByType: (type: string) =>
        type === 'navigation'
          ? [{ responseEnd: 10, serverTiming: [{ name: 'alfakit', duration: 12.34 }] }]
          : [
              { responseEnd: 30, serverTiming: [{ name: 'alfakit', duration: 4.06 }] },
              { responseEnd: 40, serverTiming: [] },
            ],
    })

    expect(latestServerTiming()).toBe(4.1)

    vi.stubGlobal('performance', undefined)

    expect(latestServerTiming()).toBeNull()
  })
})
