import {
  ComponentDiscovery,
  type DiscoveredEntry,
  type DiscoveryModules,
  type DiscoveryOptions,
} from '@alfakit/core'
import { defineAsyncComponent, defineComponent, h } from 'vue'
import type { AnyComponent } from '../context'

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
