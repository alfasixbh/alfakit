import type { Store } from '@alfakit/core'
import { computed, onScopeDispose, shallowRef, type ComputedRef, type ShallowRef } from 'vue'

type ReadableStore<T> = Pick<Store<T>, 'get' | 'subscribe'>

/** Bind a core store to a Vue ref; the subscription is disposed with the current scope. */
export function useStore<T>(store: ReadableStore<T>): ShallowRef<T> {
  const state = shallowRef<T>(store.get()) as ShallowRef<T>

  const unsubscribe = store.subscribe((next) => {
    state.value = next
  })

  onScopeDispose(unsubscribe)

  return state
}

export function useStoreSelector<T, U>(
  store: ReadableStore<T>,
  selector: (state: T) => U,
): ComputedRef<U> {
  const state = useStore(store)

  return computed(() => selector(state.value))
}
