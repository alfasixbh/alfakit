import {
  ComponentDiscovery,
  type DiscoveredEntry,
  type DiscoveryModules,
  type DiscoveryOptions,
} from '@alfakit/core'
import type { AnyComponent } from '../context.svelte'
import Discovered from './Discovered.svelte'

type ComponentFunction = (target: unknown, props: Record<string, unknown>) => unknown

/**
 * A discovered component: `Discovered.svelte` bound to the entry. The caller's props object
 * is passed through as is, so its values stay reactive.
 */
export function discoveredComponent(entry: DiscoveredEntry<AnyComponent>): AnyComponent {
  const render = Discovered as unknown as ComponentFunction

  return ((target: unknown, props: Record<string, unknown>) =>
    render(target, { entry, props })) as unknown as AnyComponent
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
