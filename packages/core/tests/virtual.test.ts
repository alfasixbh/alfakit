import { describe, expect, it, vi } from 'vitest'
import {
  VirtualList,
  fieldMemory,
  firstErroredItemIndex,
  forgetFieldMemory,
  hasNewErrors,
  virtualizeOptions,
} from '../src'

const list = (overrides = {}) =>
  new VirtualList({ threshold: 50, estimateSize: 10, overscan: 1, gap: 0, ...overrides })

describe('VirtualList', () => {
  it('renders everything at or below the threshold', () => {
    const virtual = list()

    expect(virtual.range(50)).toEqual({
      active: false,
      start: 0,
      end: 50,
      before: 0,
      after: 0,
      total: 500,
    })
    expect(new VirtualList({ threshold: null }).range(5000).active).toBe(false)
  })

  it('renders the first window before it is attached (server render, hydration)', () => {
    const virtual = list({ initialCount: 12 })
    const range = virtual.range(100)

    expect(range).toMatchObject({ active: true, start: 0, end: 12, before: 0, after: 880 })
    expect(virtual.indexes(100)).toHaveLength(12)
  })

  it('windows the visible items plus overscan from the viewport geometry', () => {
    const virtual = list()

    // The list starts 200px above the viewport, which is 50px tall: items 20–24 are visible.
    virtual.setViewport(-200, 50)

    expect(virtual.range(100)).toEqual({
      active: true,
      start: 19,
      end: 26,
      before: 190,
      after: 740,
      total: 1000,
    })

    // Scrolled past the end: keep the last item rendered rather than nothing.
    virtual.setViewport(-5000, 50)
    expect(virtual.range(100)).toMatchObject({ start: 98, end: 100, after: 0 })

    // Not yet reached: the first window.
    virtual.setViewport(600, 50)
    expect(virtual.range(100)).toMatchObject({ start: 0, end: 2 })
  })

  it('uses measured sizes and the layout gap for offsets', () => {
    const virtual = list({ gap: 2 })
    virtual.measure(0, 30)
    virtual.measure(1, 20)

    expect(virtual.offsetOf(2, 100)).toBe(30 + 2 + 20 + 2)
    expect(virtual.totalSize(3)).toBe(30 + 2 + 20 + 2 + 10)

    virtual.setViewport(-54, 10)
    expect(virtual.range(100)).toMatchObject({ start: 1, end: 4, before: 32 })
  })

  it('keeps the anchored item and its neighbours rendered for keyboard focus', () => {
    const virtual = list()
    virtual.setViewport(0, 50)
    virtual.setAnchor(7)

    expect(virtual.indexes(100)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])

    // Scrolled far away from the focused item: the window does not grow to reach it.
    virtual.setAnchor(80)
    expect(virtual.indexes(100)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('ticks its store when the geometry changes', async () => {
    const virtual = list()
    const listener = vi.fn()
    virtual.store.subscribe(listener)

    virtual.setViewport(0, 50)
    virtual.setViewport(0, 50)
    virtual.configure({ threshold: 50, estimateSize: 10, overscan: 1 })
    virtual.configure({ threshold: 10 })

    expect(listener).toHaveBeenCalledTimes(2)

    // Measurements are coalesced into one animation frame.
    virtual.measure(3, 10)
    virtual.measure(3, 40)
    await new Promise((resolve) => requestAnimationFrame(resolve))

    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('scrolls a registered element into view when asked', () => {
    const virtual = list()
    const element = document.createElement('li')
    element.scrollIntoView = vi.fn()

    virtual.scrollToIndex(70)
    virtual.register(70, element)

    expect(element.scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
    expect(virtual.indexes(100)).toContain(70)

    virtual.register(70, null)
    virtual.scrollToIndex(70)
    expect(element.scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it('windows a multi-column grid by whole rows, as tall as their tallest item', () => {
    // 3 items per row, 100 items: 34 rows of 10px before anything is measured.
    const virtual = list({ lanes: 3 })

    expect(virtual.laneCount).toBe(3)
    expect(virtual.totalSize(100)).toBe(340)
    expect(virtual.offsetOf(4, 100)).toBe(10)

    // Rows 5–9 are visible (viewport 50px tall, scrolled 50px): overscan adds a row each side.
    virtual.setViewport(-50, 50)
    expect(virtual.range(100)).toMatchObject({ active: true, start: 12, end: 33, before: 40 })

    // The tallest item sizes its row; the last row is cut to the item count.
    virtual.measure(1, 30)
    expect(virtual.offsetOf(3, 100)).toBe(30)
    virtual.setViewport(-320, 50)
    expect(virtual.range(100)).toMatchObject({ end: 100, after: 0 })

    // A focused item keeps its row and the neighbouring rows rendered.
    virtual.setViewport(0, 50)
    virtual.setAnchor(20)
    expect(virtual.indexes(100)).toContain(18)
    expect(virtual.indexes(100)).toContain(23)

    // Lanes can change with the viewport (a grid that collapses to one column).
    virtual.setLanes(1)
    expect(virtual.laneCount).toBe(1)
    expect(virtual.offsetOf(4, 100)).toBe(60)
  })

  it('counts the grid tracks of an attached list when lanes are automatic', async () => {
    const virtual = list({ lanes: 'auto' })
    const element = document.createElement('ul')
    document.body.append(element)
    // jsdom has no grid layout: answer as a browser does for `grid-template-columns`.
    const computed = vi
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({ gridTemplateColumns: '250px 250px' } as CSSStyleDeclaration)

    // Before attaching, one lane: server and client render the same first window.
    expect(virtual.laneCount).toBe(1)
    expect(VirtualList.detectLanes(element)).toBe(2)

    const detach = virtual.attach(element)
    await new Promise((resolve) => requestAnimationFrame(resolve))

    expect(virtual.laneCount).toBe(2)
    expect(virtual.range(100).start % 2).toBe(0)

    computed.mockReturnValue({ gridTemplateColumns: 'none' } as CSSStyleDeclaration)
    virtual.configure({ threshold: 50, estimateSize: 10, overscan: 1, gap: 0, lanes: 'auto' })
    expect(virtual.laneCount).toBe(2)

    detach()
    element.remove()
    computed.mockRestore()
  })

  it('builds options from the schema prop', () => {
    expect(virtualizeOptions(undefined, 53)).toEqual({ threshold: null, estimateSize: 53, gap: 0 })
    expect(virtualizeOptions({ threshold: 20, estimateSize: 80 }, 53, 12)).toEqual({
      threshold: 20,
      estimateSize: 80,
      gap: 12,
    })
    expect(virtualizeOptions({ threshold: 50 }, 120, 12, 'auto')).toEqual({
      threshold: 50,
      estimateSize: 120,
      gap: 12,
      lanes: 'auto',
    })
  })
})

describe('error helpers', () => {
  it('finds the first errored repeater item', () => {
    expect(
      firstErroredItemIndex('items', { 'items.12.name': ['x'], 'items.3.qty': ['y'], other: [] }),
    ).toBe(3)
    expect(firstErroredItemIndex('items', { 'items.3': ['y'] })).toBe(3)
    expect(firstErroredItemIndex('items', { itemsx: ['y'], 'items.name': ['z'] })).toBeNull()
  })

  it('tells new errors from edits to existing ones', () => {
    expect(hasNewErrors({}, { a: 1 })).toBe(true)
    expect(hasNewErrors({ a: 1 }, { a: 2 })).toBe(false)
    expect(hasNewErrors({ a: 1 }, {})).toBe(false)
  })
})

describe('fieldMemory', () => {
  it('remembers per-owner, per-path state until forgotten', () => {
    const owner = {}
    const store = fieldMemory(owner, 'items.3.file', () => ['a'])
    store.set(['a', 'b'])

    expect(fieldMemory(owner, 'items.3.file', () => []).get()).toEqual(['a', 'b'])
    expect(fieldMemory({}, 'items.3.file', () => []).get()).toEqual([])
    expect(fieldMemory(owner, 'items.4.file', () => []).get()).toEqual([])

    forgetFieldMemory(owner, 'items.3.file')
    expect(fieldMemory(owner, 'items.3.file', () => []).get()).toEqual([])
  })
})
