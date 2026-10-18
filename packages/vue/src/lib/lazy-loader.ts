import type { Component } from 'vue'

export interface LazyLoader {
  /** The component once it has loaded, else null (always null on the server). */
  readonly current: Component | null
  /** Starts the import (once; a failed import may be retried). */
  load(): Promise<Component>
}

/**
 * Load a component on demand and keep it, for shell parts that mount the first time they
 * open (the command palette, the shortcuts overlay) while their trigger stays eager.
 */
export function lazyLoader(load: () => Promise<Component>): LazyLoader {
  let current: Component | null = null
  let loading: Promise<Component> | undefined

  return {
    get current() {
      return current
    },
    load() {
      loading ??= load().then(
        (component) => (current = component),
        (error: unknown) => {
          loading = undefined
          throw error
        },
      )

      return loading
    },
  }
}
