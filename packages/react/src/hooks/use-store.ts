import type { Store } from '@alfakit/core'
import { useSyncExternalStore } from 'react'

/** Subscribe a React component to a core store. */
export function useStore<T>(store: Pick<Store<T>, 'get' | 'subscribe'>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

export function useStoreSelector<T, U>(
  store: Pick<Store<T>, 'get' | 'subscribe'>,
  selector: (state: T) => U,
): U {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.get()),
    () => selector(store.get()),
  )
}
