import {
  ComponentDiscovery,
  type DiscoveredEntry,
  type DiscoveryModules,
  type DiscoveryOptions,
} from '@alfakit/core'
import { createElement, useEffect, useState, useSyncExternalStore } from 'react'
import { useOptionalAlfakit, type AnyComponent } from '../context'

const subscribe = () => () => {}

/**
 * A discovered component: rendered straight away once its code has loaded (the pages that
 * use it preload it, see `ComponentDiscovery.preloadFor()`), else as soon as it arrives
 * (through state, not `<Suspense>`, whose reveal React throttles by up to 300 ms).
 * Each mount keeps the path it started with, so loading never remounts a field.
 *
 * Where pages are not preloaded (starter kits, standalone components), the server render
 * and hydration leave it out even when its code is loaded: a long-lived SSR server keeps
 * what earlier requests loaded, a fresh browser has none of it (OM-B06).
 */
export function discoveredComponent(entry: DiscoveredEntry<AnyComponent>): AnyComponent {
  function Discovered(props: Record<string, unknown>) {
    const preloaded = useOptionalAlfakit()?.preloadsPageComponents === true
    // False on the server and while hydrating, true for every later render and mount.
    const hydrated = useSyncExternalStore(
      subscribe,
      () => true,
      () => false,
    )
    const ready = preloaded || hydrated
    const [state, setState] = useState<{ component?: AnyComponent; error?: unknown }>(() => ({
      component: ready ? entry.current : undefined,
    }))
    const component = state.component ?? (ready ? entry.current : undefined)

    useEffect(() => {
      if (component) return

      let active = true

      entry.load().then(
        (loaded) => {
          if (active) setState({ component: loaded })
        },
        (error: unknown) => {
          if (active) setState({ error: error ?? new Error(`Failed to load ${entry.key}`) })
        },
      )

      return () => {
        active = false
      }
    }, [component])

    if (state.error !== undefined) throw state.error

    return component ? createElement(component, props) : null
  }

  Discovered.displayName = `Discovered(${entry.key})`

  return Discovered
}

export interface DiscoveredComponents {
  discovery: ComponentDiscovery<AnyComponent>
  components: Record<string, AnyComponent>
  pages: Record<string, AnyComponent>
}

/**
 * Registry entries for `createAlfakit({ discover: import.meta.glob(…) })`, also usable on
 * their own: `registry.registerMany(discoverComponents(modules).components)`.
 */
export function discoverComponents(
  modules: DiscoveryModules | undefined,
  options: DiscoveryOptions = {},
): DiscoveredComponents {
  const discovery = new ComponentDiscovery<AnyComponent>(modules ?? {}, options)

  return { discovery, ...discovery.map(discoveredComponent) }
}
