import {
  ComponentDiscovery,
  type DiscoveredEntry,
  type DiscoveryModules,
  type DiscoveryOptions,
} from '@alfakit/core'
import { defineAsyncComponent, defineComponent, h } from 'vue'
import type { AnyComponent } from '../context'
import { startIdScope } from './hydration'

/**
 * A discovered component: rendered straight away once its code has loaded (the pages that
 * use it preload it, see `ComponentDiscovery.preloadFor()`), else as an async component.
 */
export function discoveredComponent(entry: DiscoveredEntry<AnyComponent>): AnyComponent {
  const Async = defineAsyncComponent({ loader: () => entry.load(), suspensible: false })

  return defineComponent({
    name: `Discovered(${entry.key})`,
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      // Chosen once per mount, so loading never remounts a field.
      const Loaded = entry.current ?? Async

      // The async component starts an id scope; a loaded one starts the same, so the server
      // (which keeps loaded code between requests) and a hydrating browser that still loads
      // it number Reka's ids alike (W-V2-13, W-V3-28).
      if (Loaded !== Async) startIdScope()

      return () => h(Loaded, attrs, slots)
    },
  })
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
