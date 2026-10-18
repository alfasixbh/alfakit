import type { VirtualListOptions, VirtualRange } from '@alfakit/core'
import { VirtualList, firstErroredItemIndex, hasNewErrors } from '@alfakit/core'
import {
  computed,
  onScopeDispose,
  toValue,
  watch,
  type ComponentPublicInstance,
  type ComputedRef,
  type MaybeRefOrGetter,
  type StyleValue,
} from 'vue'
import { useOptionalFormStore } from '../components/form/form-context'
import { useStore } from './use-store'

type VueRef = Element | ComponentPublicInstance | null

export interface VirtualListBinding {
  list: VirtualList
  range: ComputedRef<VirtualRange>
  /** The indexes to render, in order. */
  indexes: ComputedRef<number[]>
  /** Reserve the space of the items outside the window (for a `<ul>`; tables use spacer rows). */
  style: ComputedRef<StyleValue | undefined>
  /** Function ref for the list element (`<ul>`, `<tbody>`): `:ref="virtual.attach"`. */
  attach: (element: VueRef) => void
  /** Function ref for an item element whose `data-index` attribute names its index. */
  item: (element: VueRef) => void
}

const elementOf = (value: VueRef): HTMLElement | null =>
  value instanceof HTMLElement ? value : ((value as ComponentPublicInstance | null)?.$el ?? null)

/**
 * Window a long list: render `indexes` only, give the list element `:ref="virtual.attach"`
 * and `:style="virtual.style"`, and each item `:ref="virtual.item"` plus
 * `:data-index="index"`. Below the threshold everything renders as usual.
 */
export function useVirtualList(
  count: MaybeRefOrGetter<number>,
  options: MaybeRefOrGetter<VirtualListOptions>,
): VirtualListBinding {
  const list = new VirtualList(toValue(options))
  const version = useStore(list.store)
  let detach: (() => void) | null = null

  watch(
    () => toValue(options),
    (next) => list.configure(next),
    { deep: true },
  )
  onScopeDispose(() => detach?.())

  const range = computed(() => {
    void version.value

    return list.range(toValue(count))
  })

  return {
    list,
    range,
    indexes: computed(() => {
      const { start, end } = range.value

      return Array.from({ length: Math.max(0, end - start) }, (_, offset) => start + offset)
    }),
    style: computed(() =>
      range.value.active
        ? { paddingTop: `${range.value.before}px`, paddingBottom: `${range.value.after}px` }
        : undefined,
    ),
    attach: (value) => {
      const element = elementOf(value)

      detach?.()
      detach = element ? list.attach(element) : null
    },
    item: (value) => {
      const element = elementOf(value)

      if (element) list.register(Number(element.dataset.index), element)
    },
  }
}

/**
 * When a submit or live validation adds errors inside a virtualised Repeater or Builder,
 * scroll the first errored item into view (it may be outside the rendered window).
 */
export function useScrollToErroredItem(
  virtual: VirtualListBinding,
  statePath: MaybeRefOrGetter<string>,
): void {
  const store = useOptionalFormStore()

  if (!store) return

  const state = useStore(store.store)

  watch(
    () => state.value.errors,
    (errors, previous) => {
      if (!virtual.range.value.active || !hasNewErrors(previous ?? {}, errors)) return

      const index = firstErroredItemIndex(toValue(statePath), errors)

      if (index !== null) virtual.list.scrollToIndex(index)
    },
  )
}
