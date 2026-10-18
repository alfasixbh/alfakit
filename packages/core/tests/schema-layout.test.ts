import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  actionsAlignmentClass,
  columnOrderClasses,
  createSchemaComponentContext,
  headingTag,
  readPersisted,
  resolveContainerStatePath,
  resolveStatePath,
  schemaGapClass,
  writePersisted,
} from '../src/schema-layout'

describe('columnOrderClasses', () => {
  it('maps breakpoints to order classes', () => {
    expect(columnOrderClasses({ default: 2, lg: 1 })).toBe('order-2 lg:order-1')
    expect(columnOrderClasses(undefined)).toBe('')
    expect(columnOrderClasses({ default: 13 })).toBe('')
  })
})

describe('schemaGapClass', () => {
  it('halves or removes the gap', () => {
    expect(schemaGapClass({})).toBe('')
    expect(schemaGapClass({ dense: true })).toBe('gap-3')
    expect(schemaGapClass({ dense: true, gap: false })).toBe('gap-0')
  })
})

describe('headingTag', () => {
  it('clamps levels and falls back', () => {
    expect(headingTag(2)).toBe('h2')
    expect(headingTag(9)).toBe('h6')
    expect(headingTag(undefined)).toBe('h3')
    expect(headingTag(undefined, 'h2')).toBe('h2')
  })
})

describe('persisted storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads and writes local and session storage', () => {
    const local = new Map<string, string>()
    const session = new Map<string, string>()
    const fake = (map: Map<string, string>) => ({
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
    })
    vi.stubGlobal('window', { localStorage: fake(local), sessionStorage: fake(session) })

    writePersisted('a', '1')
    writePersisted('b', '2', 'session')

    expect(readPersisted('a')).toBe('1')
    expect(readPersisted('b', 'session')).toBe('2')
    expect(readPersisted('b')).toBeNull()
  })

  it('is safe without a window or with blocked storage', () => {
    expect(readPersisted('a')).toBeNull()
    expect(() => writePersisted('a', '1')).not.toThrow()

    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('blocked')
      },
    })

    expect(readPersisted('a')).toBeNull()
    expect(() => writePersisted('a', '1')).not.toThrow()
  })
})

describe('schema component context', () => {
  it('resolves paths like $get()', () => {
    expect(resolveStatePath('name', 'address.street')).toBe('address.name')
    expect(resolveStatePath('../name', 'address.street')).toBe('name')
    expect(resolveStatePath('title', null)).toBe('title')
  })

  it('reads state and server context', () => {
    const context = createSchemaComponentContext(
      { operation: 'edit', recordKey: 4, record: { name: 'Ann' } },
      { title: 'Hi', address: { city: 'Oslo', street: 'Main' } },
      'address.street',
    )

    expect(context.operation).toBe('edit')
    expect(context.recordKey).toBe(4)
    expect(context.record).toEqual({ name: 'Ann' })
    expect(context.data).toEqual({})
    expect(context.get('city')).toBe('Oslo')
    expect(context.get('../title')).toBe('Hi')
    expect(context.get('title', true)).toBe('Hi')
  })

  it('resolves relative paths from the container path sent by the server', () => {
    const state = { currency: 'EUR', items: [{ quantity: 2 }, { quantity: 5 }] }
    const context = createSchemaComponentContext({ basePath: 'items.1' }, state, undefined)

    expect(context.get('quantity')).toBe(5)
    expect(context.get('../../currency')).toBe('EUR')
    expect(resolveContainerStatePath('../type', 'content.0.data')).toBe('content.0.type')
    expect(resolveContainerStatePath('title', null)).toBe('title')
  })

  it('has no state outside a form', () => {
    const context = createSchemaComponentContext(undefined, null)

    expect(context.operation).toBeNull()
    expect(context.get('title')).toBeUndefined()
  })
})

describe('actionsAlignmentClass', () => {
  it('maps alignments to justify classes', () => {
    expect(actionsAlignmentClass('end')).toBe('justify-end')
    expect(actionsAlignmentClass('center')).toBe('justify-center')
    expect(actionsAlignmentClass('between')).toBe('justify-between')
    expect(actionsAlignmentClass('start')).toBe('')
    expect(actionsAlignmentClass(undefined)).toBe('')
  })
})
