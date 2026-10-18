import type { IconPickerOption, IconPickerResponse } from './schema/icon-picker'
import { createStore, type Store } from './store'
import { debounce, type Debounced } from './utils/debounce'

export interface IconPickerSearchState {
  search: string
  /** The set the grid is filtered to, or null for all of the picker's sets. */
  set: string | null
  icons: IconPickerOption[]
  page: number
  hasMore: boolean
  total: number
  loading: boolean
  /** The last request failed. */
  error: boolean
  /** Index of the keyboard-highlighted icon (`aria-activedescendant`), -1 for none. */
  active: number
}

/** The part of `FormStore` the search needs (tests pass a stub). */
export interface IconPickerSource {
  searchIcons(
    path: string,
    query: { search?: string; set?: string | null; page?: number },
    signal?: AbortSignal,
  ): Promise<IconPickerResponse | null>
}

/**
 * Framework-agnostic state of an IconPicker's popover: the search, the set filter and the
 * pages of icons loaded so far from the server (`FormStore.searchIcons()`). Only the pages
 * the user scrolls to are fetched, so a set with thousands of icons never loads at once.
 */
export class IconPickerSearch {
  readonly store: Store<IconPickerSearchState>
  private controller: AbortController | null = null
  private readonly debounced: Debounced<[]>
  private readonly previews = new Map<string, string>()
  private loaded = false

  constructor(
    private readonly source: IconPickerSource,
    private readonly path: string,
    options: { debounce?: number } = {},
  ) {
    this.store = createStore<IconPickerSearchState>({
      search: '',
      set: null,
      icons: [],
      page: 0,
      hasMore: false,
      total: 0,
      loading: false,
      error: false,
      active: -1,
    })
    this.debounced = debounce(() => void this.fetch(1), options.debounce ?? 250)
  }

  get state(): IconPickerSearchState {
    return this.store.get()
  }

  /** Load the first page the first time the popover opens. */
  open(): void {
    if (!this.loaded) void this.fetch(1)
  }

  setSearch(search: string): void {
    this.store.update({ search, active: -1 })
    this.debounced()
  }

  setSet(set: string | null): void {
    this.store.update({ set, active: -1 })
    this.debounced.cancel()
    void this.fetch(1)
  }

  /** Append the next page (scrolling near the end of the grid, or "Load more"). */
  loadMore(): void {
    const { hasMore, loading, page } = this.state

    if (hasMore && !loading) void this.fetch(page + 1)
  }

  setActive(index: number): void {
    this.store.update({ active: index })
  }

  /**
   * Arrow keys, Home and End move the highlight through the grid (`columns` per row;
   * left and right swap in RTL). Returns the new index, or null when the key isn't one of
   * them. Reaching the end of the loaded icons loads the next page.
   */
  move(key: string, columns: number, rtl = false): number | null {
    const next = iconGridMove(this.state.active, this.state.icons.length, key, columns, rtl)

    if (next === null) return null

    this.store.update({ active: next })

    if (next >= this.state.icons.length - columns) this.loadMore()

    return next
  }

  /** What to draw for a value seen in a result (or remembered with `remember()`). */
  preview(value: string | null | undefined): string | undefined {
    return value ? this.previews.get(value) : undefined
  }

  remember(value: string, icon: string | null | undefined): void {
    if (icon) this.previews.set(value, icon)
  }

  destroy(): void {
    this.debounced.cancel()
    this.controller?.abort()
  }

  private async fetch(page: number): Promise<void> {
    this.controller?.abort()
    const controller = new AbortController()
    this.controller = controller
    const { search, set } = this.state

    this.store.update({ loading: true, error: false })

    try {
      const response = await this.source.searchIcons(
        this.path,
        { search, set, page },
        controller.signal,
      )

      if (controller.signal.aborted) return

      this.loaded = true

      const icons = response?.icons ?? []

      for (const icon of icons) this.remember(icon.value, icon.icon)

      this.store.update({
        icons: page === 1 ? icons : [...this.state.icons, ...icons],
        page: response?.page ?? page,
        hasMore: response?.hasMore ?? false,
        total: response?.total ?? icons.length,
        loading: false,
        active: page === 1 ? -1 : this.state.active,
      })
    } catch {
      if (controller.signal.aborted) return

      this.store.update({ loading: false, error: true })
    }
  }
}

/**
 * The index the highlight moves to in a grid of `count` items with `columns` per row, or
 * null when `key` doesn't move it. From no highlight (-1) any arrow key starts at the first
 * icon.
 */
export function iconGridMove(
  index: number,
  count: number,
  key: string,
  columns: number,
  rtl = false,
): number | null {
  if (count === 0) {
    return ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)
      ? -1
      : null
  }

  const last = count - 1
  const cols = Math.max(1, columns)
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight'
  const backward = rtl ? 'ArrowRight' : 'ArrowLeft'

  if (index < 0 && [forward, backward, 'ArrowUp', 'ArrowDown'].includes(key)) return 0

  switch (key) {
    case forward:
      return Math.min(last, index + 1)
    case backward:
      return Math.max(0, index - 1)
    case 'ArrowDown':
      return Math.min(last, index + cols)
    case 'ArrowUp':
      return index - cols < 0 ? index : index - cols
    case 'Home':
      return 0
    case 'End':
      return last
    default:
      return null
  }
}

/**
 * What to draw for an IconPicker's value: the server's rendering when the value is the one
 * it rendered (`selected`), else a preview seen in the search results, else the name itself
 * (a Lucide name). Custom SVG the server hasn't sanitised yet is never drawn: null.
 */
export function iconPickerPreview(
  selected: IconPickerOption | null | undefined,
  value: string | null,
  seen?: string,
): string | null {
  if (!value) return null
  if (selected?.value === value) return selected.icon
  if (seen) return seen

  return isCustomSvgIcon(value) ? null : value
}

/** Whether an IconPicker value is pasted SVG markup (`allowCustomSvg()`). */
export function isCustomSvgIcon(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().startsWith('<')
}
