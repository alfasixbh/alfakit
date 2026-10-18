import {
  createElement,
  useEffect,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from 'react'

const subscribe = () => () => {}

export type LazyComponent<P extends object> = ComponentType<P> & {
  /** Start loading the component's code ahead of its first render. */
  preload(): Promise<void>
}

/**
 * A component whose code (and heavy dependencies such as Tiptap or Chart.js) loads on
 * first use. The server render and hydration show `fallback` and never start the import;
 * client-side renders load it straight away.
 *
 * Deliberately not `React.lazy` + `<Suspense>`: React throttles revealing a suspended
 * boundary's content by up to 300 ms after its fallback was shown, which delayed every
 * dashboard chart by that much once Chart.js had already arrived. A loaded component
 * renders directly; one still loading swaps in through state as soon as its code arrives.
 */
export function lazyComponent<P extends object>(
  load: () => Promise<ComponentType<P>>,
  fallback: (props: P) => ReactNode,
): LazyComponent<P> {
  let loading: Promise<ComponentType<P>> | undefined
  let loaded: ComponentType<P> | undefined
  const preload = () =>
    (loading ??= load().then((component) => {
      loaded = component

      return component
    }))

  function LazyLoaded(props: P) {
    const client = useSyncExternalStore(
      subscribe,
      () => true,
      () => false,
    )
    const [state, setState] = useState<{ component?: ComponentType<P>; error?: unknown }>(() => ({
      component: loaded,
    }))
    const component = state.component ?? (client ? loaded : undefined)

    if (client && !component) {
      void preload().catch(() => undefined)
    }

    useEffect(() => {
      if (component) {
        return
      }

      let active = true

      preload().then(
        (resolved) => {
          if (active) setState({ component: resolved })
        },
        (error: unknown) => {
          // Rethrown while rendering so the nearest error boundary handles a failed import.
          if (active) setState({ error: error ?? new Error('Failed to load component') })
        },
      )

      return () => {
        active = false
      }
    }, [component])

    if (state.error !== undefined) {
      throw state.error
    }

    if (!client || !component) {
      return fallback(props)
    }

    return createElement(component, props)
  }

  return Object.assign(LazyLoaded, { preload: () => preload().then(() => undefined) })
}
