import type { VirtualListOptions, VirtualRange } from '@alfakit/core'
import { VirtualList, firstErroredItemIndex, hasNewErrors } from '@alfakit/core'
import { untrack } from 'svelte'
import { useOptionalFormStore } from '../components/form/form-context.svelte'
import { useStore } from './store.svelte'

export interface VirtualListBinding {
  readonly list: VirtualList
  readonly range: VirtualRange
  /** The indexes to render, in order. */
  readonly indexes: number[]
  /** Reserve the space of the items outside the window (for a `<ul>`; tables use spacer rows). */
  readonly style: string | undefined
  /** Attachment for the list element (`<ul>`, `<tbody>`): `{@attach virtual.attach}`. */
  attach: (element: HTMLElement) => () => void
  /** Attachment for an item element whose `data-index` attribute names its index. */
  item: (element: HTMLElement) => () => void
}

/**
 * Window a long list: render `indexes` only, give the list element `{@attach virtual.attach}`
 * and `style`, and each item `{@attach virtual.item}` plus `data-index={index}`. Below the
 * threshold everything renders as usual. Call during component initialisation.
 */
export function useVirtualList(
  count: () => number,
  options: () => VirtualListOptions,
): VirtualListBinding {
  const list = new VirtualList(untrack(options))
  const version = useStore(list.store)

  $effect(() => {
    list.configure(options())
  })

  const range = $derived.by(() => {
    void version.current

    return list.range(count())
  })
  const indexes = $derived(
    Array.from(
      { length: Math.max(0, range.end - range.start) },
      (_, offset) => range.start + offset,
    ),
  )
  const style = $derived(
    range.active ? `padding-top: ${range.before}px; padding-bottom: ${range.after}px` : undefined,
  )

  return {
    list,
    get range() {
      return range
    },
    get indexes() {
      return indexes
    },
    get style() {
      return style
    },
    attach: (element) => list.attach(element),
    item: (element) => {
      const index = Number(element.dataset.index)
      list.register(index, element)

      return () => list.register(index, null)
    },
  }
}

/**
 * When a submit or live validation adds errors inside a virtualised Repeater or Builder,
 * scroll the first errored item into view (it may be outside the rendered window).
 */
export function useScrollToErroredItem(virtual: VirtualListBinding, statePath: () => string): void {
  const store = useOptionalFormStore()

  if (!store) return

  const state = useStore(store.store)
  let previous = untrack(() => state.current.errors)

  $effect(() => {
    const errors = state.current.errors

    untrack(() => {
      if (virtual.range.active && hasNewErrors(previous, errors)) {
        const index = firstErroredItemIndex(statePath(), errors)

        if (index !== null) virtual.list.scrollToIndex(index)
      }

      previous = errors
    })
  })
}
