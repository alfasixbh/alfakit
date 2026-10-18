import type { Store } from '@alfakit/core'
import { onDestroy } from 'svelte'

export interface StoreBinding<T> {
  /** The latest store state (reactive). */
  readonly current: T
}

/**
 * Bind a core store to Svelte reactivity. Call during component initialisation; the
 * subscription is released when the component is destroyed.
 */
export function useStore<T>(store: Pick<Store<T>, 'get' | 'subscribe'>): StoreBinding<T> {
  let current = $state.raw(store.get())

  const unsubscribe = store.subscribe((next) => {
    current = next
  })

  onDestroy(unsubscribe)

  return {
    get current() {
      return current
    },
  }
}

export function useStoreSelector<T, U>(
  store: Pick<Store<T>, 'get' | 'subscribe'>,
  selector: (state: T) => U,
): StoreBinding<U> {
  const binding = useStore(store)
  const selected = $derived(selector(binding.current))

  return {
    get current() {
      return selected
    },
  }
}
