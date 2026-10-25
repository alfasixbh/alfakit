import {
  starterKitNavigation,
  toStarterKitNavGroups,
  toStarterKitUserMenuItems,
  type StarterKitNavGroup,
  type StarterKitNavigationSchema,
  type StarterKitUserMenuItem,
} from '@alfakit/core'
import { usePage } from '@inertiajs/vue3'
import { computed, type ComputedRef } from 'vue'

// Its own module, away from `createStarterKitPage()`: the host's sidebar imports it on every
// page, and it must not pull the panel runtime into the host's main chunk.

export interface AlfakitNavigation {
  /** The panel's navigation as the server shared it, or null for guests. */
  navigation: StarterKitNavigationSchema | null
  /** Its groups as plain items (`title`, `href`, `icon`, `isActive`, `badge`, `children`). */
  groups: StarterKitNavGroup[]
  /**
   * The panel's user menu links (`userMenuItems()`, Billing's entry…) for the kit's user
   * menu: `<AlfakitUserMenuItems />` renders them with the app's dropdown items.
   */
  userMenuItems: StarterKitUserMenuItem[]
}

/**
 * The navigation of a `starterKit()` panel (the first one unless `panelId` is given), for the
 * host's sidebar. Every Inertia page of the application carries it, so the host's own pages
 * list the panel's resources too.
 *
 * ```ts
 * const navigation = useAlfakitNavigation()
 * // navigation.value.groups
 * ```
 */
export function useAlfakitNavigation(panelId?: string): ComputedRef<AlfakitNavigation> {
  const page = usePage()

  return computed(() => {
    const navigation = starterKitNavigation(page.props, panelId)

    return {
      navigation,
      groups: toStarterKitNavGroups(navigation?.groups),
      userMenuItems: toStarterKitUserMenuItems(navigation?.userMenu),
    }
  })
}
