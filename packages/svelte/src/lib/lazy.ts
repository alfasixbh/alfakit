import type { Component } from 'svelte'

export interface LazyLoader<P extends Record<string, unknown>> {
  /** The component once it has loaded. */
  readonly current: Component<P> | undefined
  load(): Promise<Component<P>>
}

/**
 * Load a component (and heavy dependencies such as Tiptap or Chart.js) on first use. Render
 * it with `<Lazy>`, which only starts the import in the browser, never during SSR.
 */
export function lazyLoader<P extends Record<string, unknown>>(
  load: () => Promise<Component<P>>,
): LazyLoader<P> {
  let current: Component<P> | undefined
  let promise: Promise<Component<P>> | undefined

  return {
    get current() {
      return current
    },
    load() {
      promise ??= load().then(
        (component) => (current = component),
        (error: unknown) => {
          promise = undefined
          throw error
        },
      )

      return promise
    },
  }
}
