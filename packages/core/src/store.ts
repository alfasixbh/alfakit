/**
 * A tiny framework-agnostic observable store. React binds it with
 * `useSyncExternalStore`, Vue with `shallowRef` + subscribe, Svelte with `$state`.
 */
export type Listener<T> = (state: T, previous: T) => void

export interface Store<T> {
  get: () => T
  set: (next: T | ((current: T) => T)) => void
  update: (patch: Partial<T>) => void
  subscribe: (listener: Listener<T>) => () => void
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<Listener<T>>()

  const set = (next: T | ((current: T) => T)) => {
    const previous = state
    state = typeof next === 'function' ? (next as (current: T) => T)(state) : next

    if (state === previous) {
      return
    }

    for (const listener of listeners) {
      listener(state, previous)
    }
  }

  return {
    get: () => state,
    set,
    update: (patch) => set((current) => ({ ...current, ...patch })),
    subscribe: (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/** Derive a read-only store. */
export function derived<T, U>(
  store: Store<T>,
  selector: (state: T) => U,
): Pick<Store<U>, 'get' | 'subscribe'> {
  return {
    get: () => selector(store.get()),
    subscribe: (listener) => {
      let previous = selector(store.get())

      return store.subscribe((state) => {
        const next = selector(state)

        if (next !== previous) {
          const old = previous
          previous = next
          listener(next, old)
        }
      })
    },
  }
}
