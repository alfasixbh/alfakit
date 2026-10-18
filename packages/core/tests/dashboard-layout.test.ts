import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardEditor, dashboardMoveForKey } from '../src/dashboard-layout'
import type * as Http from '../src/http'
import type { DashboardCustomizeSchema } from '../src/schema/widgets'

const posts: unknown[] = []

vi.mock('../src/http', async (importOriginal) => {
  const original = await importOriginal<typeof Http>()

  return {
    ...original,
    requestJson: async (
      _url: string,
      options: { body?: { layout?: unknown; reset?: boolean } } = {},
    ) => {
      posts.push(options.body)

      return { layout: options.body?.reset ? schema().defaultLayout : options.body?.layout }
    },
  }
})

function schema(): DashboardCustomizeSchema {
  const spans = [
    { value: 1, label: '1 column', columnSpan: { default: 'full', lg: 1 } },
    { value: 2, label: 'Full width', columnSpan: { default: 'full', lg: 'full' } },
  ]

  return {
    endpoint: '/_alfakit/dashboard/layout',
    token: 'ctx',
    customized: false,
    layout: [
      { id: 'a', span: null, hidden: false },
      { id: 'b', span: null, hidden: false },
      { id: 'c', span: null, hidden: false },
    ],
    defaultLayout: [
      { id: 'a', span: null, hidden: false },
      { id: 'b', span: null, hidden: false },
      { id: 'c', span: null, hidden: false },
    ],
    library: [
      { id: 'a', label: 'Alpha', default: true, span: 1, spans },
      { id: 'b', label: 'Beta', default: true, span: 1, spans },
      { id: 'c', label: 'Gamma', default: true, span: 1, spans },
      { id: 'd', label: 'Delta', default: false, span: 2, spans },
    ],
  }
}

const ids = (editor: DashboardEditor) => editor.visible().map((entry) => entry.id)

describe('DashboardEditor', () => {
  beforeEach(() => {
    posts.length = 0
  })

  it('reorders with moves, keyboard keys and drops, and announces the new position', () => {
    const editor = new DashboardEditor(schema())

    editor.start()
    editor.move('a', 1)

    expect(ids(editor)).toEqual(['b', 'a', 'c'])
    expect(editor.store.get().announcement).toBe('Moved Alpha to position 2 of 3')
    expect(editor.store.get().dirty).toBe(true)

    editor.move('c', 'first')
    expect(ids(editor)).toEqual(['c', 'b', 'a'])

    editor.dragStart('a')
    editor.dropOn('c')
    expect(ids(editor)).toEqual(['a', 'c', 'b'])
    expect(editor.store.get().dragging).toBeNull()

    // Back to the saved order: no longer dirty.
    editor.move('b', -1)
    expect(ids(editor)).toEqual(['a', 'b', 'c'])
    expect(editor.store.get().dirty).toBe(false)
  })

  it('maps arrow keys to moves following the reading direction', () => {
    expect(dashboardMoveForKey('ArrowRight')).toBe(1)
    expect(dashboardMoveForKey('ArrowRight', 'rtl')).toBe(-1)
    expect(dashboardMoveForKey('ArrowLeft', 'rtl')).toBe(1)
    expect(dashboardMoveForKey('ArrowUp', 'rtl')).toBe(-1)
    expect(dashboardMoveForKey('Home')).toBe('first')
    expect(dashboardMoveForKey('End')).toBe('last')
    expect(dashboardMoveForKey('a')).toBeNull()
  })

  it('hides, adds and resizes widgets within their allowed spans', () => {
    const editor = new DashboardEditor(schema())

    editor.start()
    editor.hide('b')

    expect(ids(editor)).toEqual(['a', 'c'])
    expect(editor.available().map((widget) => widget.id)).toEqual(['b', 'd'])

    editor.add('d')
    editor.add('b')
    expect(ids(editor)).toEqual(['a', 'c', 'd', 'b'])

    editor.setSpan('a', 2)
    expect(editor.spanOf('a')).toBe(2)
    // Not an allowed span: ignored.
    editor.setSpan('a', 3)
    expect(editor.spanOf('a')).toBe(2)
    // The widget's own span is stored as null.
    editor.setSpan('d', 2)
    expect(editor.store.get().layout.find((entry) => entry.id === 'd')?.span).toBeNull()
  })

  it('cancels the draft', () => {
    const editor = new DashboardEditor(schema())

    editor.start()
    editor.hide('a')
    editor.cancel()

    expect(ids(editor)).toEqual(['a', 'b', 'c'])
    expect(editor.store.get().editing).toBe(false)
  })

  it('saves the draft, and resets when it matches the default', async () => {
    const onSaved = vi.fn()
    const editor = new DashboardEditor(schema(), { onSaved })

    editor.start()
    editor.move('a', 'last')
    await editor.save()

    expect(posts[0]).toEqual({
      token: 'ctx',
      layout: [
        { id: 'b', span: null, hidden: false },
        { id: 'c', span: null, hidden: false },
        { id: 'a', span: null, hidden: false },
      ],
    })
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(editor.store.get().editing).toBe(false)

    editor.start()
    editor.resetDraft()
    await editor.save()

    expect(posts[1]).toEqual({ token: 'ctx', reset: true })
    expect(ids(editor)).toEqual(['a', 'b', 'c'])
  })
})
