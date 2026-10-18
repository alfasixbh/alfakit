import type { VirtualizeSchema } from './schema/common'
import { createStore, type Store } from './store'

/**
 * Windowed rendering for long lists (Repeater and Builder items, table rows).
 *
 * The list keeps measured item sizes and the viewport geometry, and `range(count)` says
 * which indexes to render plus the space to reserve before and after them. It holds no
 * framework state: a renderer re-renders when `store` ticks, registers each rendered item
 * element with `register()` so it is measured, and calls `attach()` on the list element
 * once mounted. Before `attach()` (server rendering, hydration) the range is the first
 * `initialCount` items, so server and client markup match.
 */
export interface VirtualListOptions {
  /** Virtualise when the count is above this many items; `null` never virtualises. */
  threshold: number | null
  /** Height estimate for an item that has not been measured yet, in px. */
  estimateSize?: number
  /** Items rendered beyond the visible ones on each side. */
  overscan?: number
  /** Space between items the layout adds (`gap-3` = 12), in px. */
  gap?: number
  /** Rows rendered before the list is attached (server render and hydration). */
  initialCount?: number
  /**
   * Items per row for lists laid out as a multi-column grid: a number, or `'auto'` to
   * count the tracks of the list element's `grid-template-columns` once attached (one
   * lane before that, so server and client markup match). The window then moves by whole
   * rows and a row is as tall as its tallest item.
   */
  lanes?: number | 'auto'
}

export interface VirtualRange {
  /** False when the list is short enough to render in full. */
  active: boolean
  /** First rendered index. */
  start: number
  /** Index after the last rendered one. */
  end: number
  /** Space to reserve before the first rendered item, in px. */
  before: number
  /** Space to reserve after the last rendered item, in px. */
  after: number
  /** Estimated height of the whole list, in px. */
  total: number
}

export const DEFAULT_VIRTUALIZE_THRESHOLD = 50

/** Default height estimates (px) by list kind, before an item is measured. */
export const VIRTUAL_ESTIMATES = {
  /** A Repeater or Builder item card with a header and one row of fields. */
  item: 120,
  /** A table row. */
  row: 53,
} as const

/**
 * Options for a renderer from the `virtualize` schema prop: `undefined` means the server
 * turned virtualisation off for this component.
 */
export function virtualizeOptions(
  schema: VirtualizeSchema | undefined,
  estimateSize: number,
  gap = 0,
  lanes?: number | 'auto',
): VirtualListOptions {
  return {
    threshold: schema ? schema.threshold : null,
    estimateSize: schema?.estimateSize ?? estimateSize,
    gap,
    ...(lanes === undefined ? {} : { lanes }),
  }
}

export class VirtualList {
  /** Ticks whenever the range may have changed; renderers subscribe to re-render. */
  readonly store: Store<number> = createStore(0)

  private options: Required<VirtualListOptions>

  /** Items per row (see `VirtualListOptions.lanes`). */
  private lanes = 1

  private readonly sizes = new Map<number, number>()

  private readonly elements = new Map<number, Element>()

  private readonly indexOf = new WeakMap<Element, number>()

  private observer: ResizeObserver | null = null

  private element: HTMLElement | null = null

  private attached = false

  /** Visible window in list coordinates (px from the list's top edge). */
  private viewStart = 0

  private viewEnd = 0

  private frame: number | null = null

  /** Index kept rendered (with its neighbours) because it has focus or was scrolled to. */
  private anchor: number | null = null

  private pendingScroll: number | null = null

  /** Index scrolled to whose window stays until it is seen inside the viewport. */
  private jumped: number | null = null

  constructor(options: VirtualListOptions) {
    this.options = VirtualList.normalise(options)
    this.lanes = typeof this.options.lanes === 'number' ? Math.max(1, this.options.lanes) : 1
  }

  private static normalise(options: VirtualListOptions): Required<VirtualListOptions> {
    const estimateSize = options.estimateSize ?? VIRTUAL_ESTIMATES.item
    const overscan = options.overscan ?? 4

    return {
      threshold: options.threshold,
      estimateSize,
      overscan,
      gap: options.gap ?? 0,
      initialCount: options.initialCount ?? Math.ceil(900 / estimateSize) + overscan,
      lanes: options.lanes ?? 1,
    }
  }

  /** Replace the options (a server refresh may change the threshold). */
  configure(options: VirtualListOptions): void {
    const next = VirtualList.normalise(options)
    const changed = (Object.keys(next) as (keyof VirtualListOptions)[]).some(
      (key) => next[key] !== this.options[key],
    )

    if (changed) {
      this.options = next

      if (typeof next.lanes === 'number') {
        this.lanes = Math.max(1, next.lanes)
      } else if (next.lanes === 'auto' && this.element) {
        this.lanes = VirtualList.detectLanes(this.element)
      }

      this.tick()
    }
  }

  /** Items per row the window currently moves by. */
  get laneCount(): number {
    return this.lanes
  }

  /** Set the items per row (a renderer that knows its grid; `'auto'` lists measure it). */
  setLanes(lanes: number): void {
    const next = Math.max(1, Math.floor(lanes))

    if (next === this.lanes) return

    this.lanes = next
    this.tick()
  }

  /** The number of grid tracks of an element's `grid-template-columns` (1 when not a grid). */
  static detectLanes(element: Element): number {
    if (typeof getComputedStyle !== 'function') return 1

    const columns = getComputedStyle(element).gridTemplateColumns

    if (!columns || columns === 'none') return 1

    return Math.max(1, columns.trim().split(/\s+/).length)
  }

  private rowOf(index: number): number {
    return Math.floor(index / this.lanes)
  }

  private rowCount(count: number): number {
    return Math.ceil(count / this.lanes)
  }

  /** A row is as tall as its tallest measured item, or the estimate when none is measured. */
  private rowSize(row: number): number {
    let size = 0
    let measured = false

    for (let index = row * this.lanes; index < (row + 1) * this.lanes; index++) {
      const itemSize = this.sizes.get(index)

      if (itemSize !== undefined) {
        measured = true
        size = Math.max(size, itemSize)
      }
    }

    return measured ? size : this.options.estimateSize
  }

  private offsetOfRow(row: number, rows: number): number {
    let offset = 0
    const end = Math.min(row, rows)

    for (let i = 0; i < end; i++) {
      offset += this.rowSize(i) + this.options.gap
    }

    return offset
  }

  isActive(count: number): boolean {
    return this.options.threshold !== null && count > this.options.threshold
  }

  sizeOf(index: number): number {
    return this.sizes.get(index) ?? this.options.estimateSize
  }

  /** Offset of an item's top edge (its row's top edge) from the list's top edge. */
  offsetOf(index: number, count: number): number {
    const rows = this.rowCount(count)

    return this.offsetOfRow(index >= count ? rows : this.rowOf(index), rows)
  }

  totalSize(count: number): number {
    return count === 0 ? 0 : this.offsetOf(count, count) - this.options.gap
  }

  /** The indexes to render and the space around them, for `count` items. */
  range(count: number): VirtualRange {
    const total = this.totalSize(count)

    if (!this.isActive(count)) {
      return { active: false, start: 0, end: count, before: 0, after: 0, total }
    }

    // The window is computed in rows (one item per row unless the list has lanes) and then
    // widened to whole rows of items.
    const rows = this.rowCount(count)
    let start: number
    let end: number

    const target = this.pendingScroll ?? this.jumped

    if (target !== null && target < count) {
      // Jump the window to the item being scrolled to (so it exists to scroll to) and keep
      // it there until the scroll has brought the item into the viewport.
      const row = this.rowOf(target)
      start = Math.max(0, row - this.options.overscan)
      end = Math.min(rows, row + 1 + this.options.overscan)
    } else if (!this.attached) {
      start = 0
      end = Math.min(rows, this.options.initialCount)
    } else {
      const { overscan } = this.options
      let first = rows
      let last = -1
      let offset = 0

      for (let row = 0; row < rows; row++) {
        const size = this.rowSize(row)

        if (offset + size > this.viewStart && first === rows) first = row
        if (offset < this.viewEnd) last = row
        else break

        offset += size + this.options.gap
      }

      if (first === rows || last < first) {
        // Nothing visible (the list is scrolled out of view): keep the window nearest to it.
        first = this.viewEnd <= 0 ? 0 : rows - 1
        last = first
      }

      start = Math.max(0, first - overscan)
      end = Math.min(rows, last + 1 + overscan)
    }

    // A focused item stays rendered with its neighbours so Tab reaches the next one. It is
    // near the window (focus scrolls into view); once the user scrolls far away from it the
    // range stays a window rather than growing to span the distance.
    if (this.anchor !== null && this.anchor < count) {
      const row = this.rowOf(this.anchor)

      if (row >= start - 3 * this.options.overscan && row < end + 3 * this.options.overscan) {
        start = Math.min(start, Math.max(0, row - 1))
        end = Math.max(end, Math.min(rows, row + 2))
      }
    }

    const before = this.offsetOfRow(start, rows)
    const after = end >= rows ? 0 : total - this.offsetOfRow(end, rows) + this.options.gap

    return {
      active: true,
      start: start * this.lanes,
      end: Math.min(count, end * this.lanes),
      before,
      after,
      total,
    }
  }

  /** The indexes `range()` renders, in order. */
  indexes(count: number): number[] {
    const { start, end } = this.range(count)

    return Array.from({ length: Math.max(0, end - start) }, (_, offset) => start + offset)
  }

  /** Record an item's measured height. */
  measure(index: number, size: number): void {
    if (size <= 0 || this.sizes.get(index) === size) return

    this.sizes.set(index, size)
    this.schedule()
  }

  /**
   * Set the visible window from the list's top edge relative to the viewport (negative once
   * scrolled past) and the viewport height. `attach()` does this on scroll; tests call it.
   */
  setViewport(top: number, viewportHeight: number): void {
    const start = -top
    const end = start + viewportHeight

    if (start === this.viewStart && end === this.viewEnd && this.attached) return

    this.attached = true
    this.viewStart = start
    this.viewEnd = end
    this.tick()
  }

  /** Keep `index` rendered (with its neighbours) while it has focus. */
  setAnchor(index: number | null): void {
    if (index === this.anchor) return

    this.anchor = index
    this.tick()
  }

  /** Render `index` and scroll it into view once it is in the DOM. */
  scrollToIndex(index: number): void {
    this.pendingScroll = index
    this.anchor = index
    this.tick()

    const element = this.elements.get(index)

    if (element?.isConnected) this.flushScroll(index, element)
  }

  /**
   * Track an item's element (pass `null` when it unmounts): it is measured, re-measured
   * when it resizes, and scrolled to when `scrollToIndex()` asked for it.
   */
  register(index: number, element: Element | null): void {
    const previous = this.elements.get(index)

    if (previous && previous !== element) {
      this.observer?.unobserve(previous)
      this.indexOf.delete(previous)
      this.elements.delete(index)
    }

    if (!element) return

    this.elements.set(index, element)
    this.indexOf.set(element, index)
    this.observer?.observe(element)

    if (this.pendingScroll === index) this.flushScroll(index, element)
  }

  /**
   * Start following the list element: scrolling anywhere, resizing, and focus moving
   * between items. Returns the detach function.
   */
  attach(element: HTMLElement): () => void {
    this.element = element

    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const index = this.indexOf.get(entry.target)

          if (index !== undefined) {
            this.measure(index, entry.target.getBoundingClientRect().height)
          }
        }
      })

      for (const item of this.elements.values()) this.observer.observe(item)
    }

    const update = () => this.schedule()
    const focus = (event: FocusEvent) => {
      const item = (event.target as Element | null)?.closest?.('[data-index]')
      const index = item ? Number(item.getAttribute('data-index')) : NaN

      if (!Number.isNaN(index)) this.setAnchor(index)
    }

    window.addEventListener('scroll', update, { capture: true, passive: true })
    window.addEventListener('resize', update)
    element.addEventListener('focusin', focus)
    this.schedule()

    return () => {
      window.removeEventListener('scroll', update, { capture: true })
      window.removeEventListener('resize', update)
      element.removeEventListener('focusin', focus)
      this.observer?.disconnect()
      this.observer = null
      this.element = null

      if (this.frame !== null) {
        cancelAnimationFrame(this.frame)
        this.frame = null
      }
    }
  }

  private flushScroll(index: number, element: Element): void {
    this.pendingScroll = null
    this.jumped = index

    if (typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ block: 'center' })
    }

    this.sizes.delete(index)
    this.schedule()
  }

  private schedule(): void {
    if (this.frame !== null || typeof requestAnimationFrame === 'undefined') {
      if (this.frame === null) this.read()

      return
    }

    this.frame = requestAnimationFrame(() => {
      this.frame = null
      this.read()
    })
  }

  private read(): void {
    if (!this.element) {
      this.tick()

      return
    }

    if (this.options.lanes === 'auto') {
      this.lanes = VirtualList.detectLanes(this.element)
    }

    for (const [index, item] of this.elements) {
      // Vue and Svelte function refs don't report unmounts: drop detached elements here.
      if (!item.isConnected) {
        this.elements.delete(index)
        this.indexOf.delete(item)
        this.observer?.unobserve(item)

        continue
      }

      const size = item.getBoundingClientRect().height

      if (size > 0) this.sizes.set(index, size)
    }

    if (this.jumped !== null) {
      const rect = this.elements.get(this.jumped)?.getBoundingClientRect()

      if (rect && rect.bottom > 0 && rect.top < window.innerHeight) this.jumped = null
    }

    this.setViewport(this.element.getBoundingClientRect().top, window.innerHeight)
    this.tick()
  }

  private tick(): void {
    this.store.set((version) => version + 1)
  }
}

/**
 * The first Repeater/Builder item that has a validation error (`items.3.name` → 3), to
 * scroll into view when the errors arrive. `null` when no item has one.
 */
export function firstErroredItemIndex(
  statePath: string,
  errors: Record<string, unknown>,
): number | null {
  const prefix = `${statePath}.`
  let first: number | null = null

  for (const key of Object.keys(errors)) {
    if (!key.startsWith(prefix)) continue

    const index = Number.parseInt(key.slice(prefix.length), 10)

    if (!Number.isNaN(index) && (first === null || index < first)) first = index
  }

  return first
}

/**
 * The error keys that are new compared to the previous errors; the renderer scrolls to
 * the first errored item only when a submit or live validation adds errors, not while the
 * user edits.
 */
export function hasNewErrors(
  previous: Record<string, unknown>,
  errors: Record<string, unknown>,
): boolean {
  return Object.keys(errors).some((key) => !(key in previous))
}
