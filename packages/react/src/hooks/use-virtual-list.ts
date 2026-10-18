import type { VirtualListOptions, VirtualRange } from '@alfakit/core'
import { VirtualList, firstErroredItemIndex, hasNewErrors } from '@alfakit/core'
import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { useOptionalFormStore } from '../components/form/form-context'
import { useStore, useStoreSelector } from './use-store'

export interface VirtualListBinding {
  list: VirtualList
  range: VirtualRange
  /** The indexes to render, in order. */
  indexes: number[]
  /** Reserve the space of the items outside the window (for a `<ul>`; tables use spacer rows). */
  style: CSSProperties | undefined
  /** Ref callback for the list element (`<ul>`, `<tbody>`). */
  attach: (element: HTMLElement | null) => void | (() => void)
  /** Ref callback for an item element; the item's `data-index` attribute names its index. */
  item: (element: HTMLElement | null) => void | (() => void)
}

/**
 * Window a long list: render `indexes` only, give the list element `ref={attach}` and
 * `style`, and each item `ref={item}` plus `data-index={index}`. Below the threshold
 * everything renders as usual. Destructure the result: the React Compiler lint treats an
 * object whose member is passed to `ref` as a ref, and refuses to read it during render.
 */
export function useVirtualList(count: number, options: VirtualListOptions): VirtualListBinding {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => new VirtualList(options), [])

  useStore(list.store)

  useEffect(() => {
    list.configure(options)
  }, [list, options.threshold, options.estimateSize, options.overscan, options.gap]) // eslint-disable-line react-hooks/exhaustive-deps

  const range = list.range(count)
  const attach = useCallback(
    (element: HTMLElement | null) => (element ? list.attach(element) : undefined),
    [list],
  )
  const item = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return undefined

      const index = Number(element.dataset.index)
      list.register(index, element)

      return () => list.register(index, null)
    },
    [list],
  )

  return {
    list,
    range,
    indexes: list.indexes(count),
    style: range.active ? { paddingTop: range.before, paddingBottom: range.after } : undefined,
    attach,
    item,
  }
}

/**
 * When a submit or live validation adds errors inside a virtualised Repeater or Builder,
 * scroll the first errored item into view (it may be outside the rendered window).
 */
export function useScrollToErroredItem(
  list: VirtualList,
  active: boolean,
  statePath: string,
): void {
  const store = useOptionalFormStore()
  const errors = useStoreSelector(store?.store ?? EMPTY_STORE, (state) => state.errors)
  const previous = useRef(errors)

  useEffect(() => {
    if (active && hasNewErrors(previous.current, errors)) {
      const index = firstErroredItemIndex(statePath, errors)

      if (index !== null) list.scrollToIndex(index)
    }

    previous.current = errors
  }, [errors, statePath, list, active])
}

const NO_ERRORS = { errors: {} as Record<string, string[]> }
const EMPTY_STORE = { get: () => NO_ERRORS, subscribe: () => () => {} }
