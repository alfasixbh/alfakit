import {
  deletePath,
  getPath,
  hasPath,
  joinPath,
  parentPath,
  replacePlaceholder,
  setPath,
  templateForIndex,
} from '../src/utils/path'

describe('path utils', () => {
  const source = { a: { b: [{ c: 1 }, { c: 2 }] }, d: null }

  it('gets nested values with fallbacks', () => {
    expect(getPath(source, 'a.b.1.c')).toBe(2)
    expect(getPath(source, 'a.x.y', 'fallback')).toBe('fallback')
    expect(getPath(source, '')).toBe(source)
    expect(hasPath(source, 'd')).toBe(true)
    expect(hasPath(source, 'a.b.5')).toBe(false)
  })

  it('sets immutably and creates arrays for numeric segments', () => {
    const next = setPath(source, 'a.b.1.c', 3)

    expect(next.a.b[1]?.c).toBe(3)
    expect(source.a.b[1]?.c).toBe(2)
    expect(next.a.b[0]).toBe(source.a.b[0])

    const created = setPath({}, 'items.0.name', 'x') as { items: Array<{ name: string }> }
    expect(Array.isArray(created.items)).toBe(true)
    expect(created.items[0]?.name).toBe('x')
  })

  it('deletes from arrays and objects', () => {
    const next = deletePath(source, 'a.b.0') as typeof source
    expect(next.a.b).toEqual([{ c: 2 }])
    expect(deletePath({ x: 1, y: 2 }, 'x')).toEqual({ y: 2 })
  })

  it('joins, parents and replaces placeholders', () => {
    expect(joinPath('items', 0, 'name')).toBe('items.0.name')
    expect(parentPath('items.0.name')).toBe('items.0')
    expect(
      replacePlaceholder(
        { statePath: 'items.__INDEX__.name', nested: ['__INDEX__'] },
        '__INDEX__',
        '3',
      ),
    ).toEqual({ statePath: 'items.3.name', nested: ['3'] })
  })

  it('fills in only the outer placeholder of a nested template (a repeater in a builder block)', () => {
    const block = replacePlaceholder(
      {
        statePath: 'content.__INDEX__.data.items',
        template: [{ statePath: 'content.__INDEX__.data.items.__INDEX__.question' }],
      },
      '__INDEX__',
      '2',
    )

    expect(block).toEqual({
      statePath: 'content.2.data.items',
      template: [{ statePath: 'content.2.data.items.__INDEX__.question' }],
    })
    expect(replacePlaceholder(block.template, '__INDEX__', '0')).toEqual([
      { statePath: 'content.2.data.items.0.question' },
    ])
  })

  it('gives the same template instance for the same index, so new items do not re-render on every render', () => {
    const template = [{ statePath: 'items.__INDEX__.name' }]

    expect(templateForIndex(template, 1)).toBe(templateForIndex(template, 1))
    expect(templateForIndex(template, 1)).toEqual([{ statePath: 'items.1.name' }])
    expect(templateForIndex(template, 2)).not.toBe(templateForIndex(template, 1))
    expect(templateForIndex([...template], 1)).not.toBe(templateForIndex(template, 1))
  })
})
