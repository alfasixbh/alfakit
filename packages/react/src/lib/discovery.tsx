import {
  ComponentDiscovery,
  type DiscoveredEntry,
  type DiscoveryModules,
  type DiscoveryOptions,
} from '@alfakit/core'
import { createElement, useEffect, useState } from 'react'
import type { AnyComponent } from '../context'

/**
 * A discovered component: rendered straight away once its code has loaded (the pages that
 * use it preload it, see `ComponentDiscovery.preloadFor()`), else as soon as it arrives
 * (through state, not `<Suspense>`, whose reveal React throttles by up to 300 ms).
 * Each mount keeps the path it started with, so loading never remounts a field.
 */
export function discoveredComponent(entry: DiscoveredEntry<AnyComponent>): AnyComponent {
  function Discovered(props: Record<string, unknown>) {
    const [state, setState] = useState<{ component?: AnyComponent; error?: unknown }>(() => ({
      component: entry.current,
    }))

    useEffect(() => {
      if (state.component) return

      let active = true

      entry.load().then(
        (component) => {
          if (active) setState({ component })
        },
        (error: unknown) => {
          if (active) setState({ error: error ?? new Error(`Failed to load ${entry.key}`) })
        },
      )

      return () => {
        active = false
      }
    }, [state.component])

    if (state.error !== undefined) throw state.error

    return state.component ? createElement(state.component, props) : null
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
