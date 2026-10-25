import {
  starterKitNavigation,
  toStarterKitNavGroups,
  toStarterKitUserMenuItems,
  type StarterKitNavGroup,
  type StarterKitNavigationSchema,
  type StarterKitUserMenuItem,
} from '@alfakit/core'
import { usePage } from '@inertiajs/react'
import { useMemo } from 'react'

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
 * ```tsx
 * const { groups } = useAlfakitNavigation()
 * ```
 */
export function useAlfakitNavigation(panelId?: string): AlfakitNavigation {
  const props = usePage().props
  const navigation = starterKitNavigation(props, panelId)

  return useMemo(
    () => ({
      navigation,
      groups: toStarterKitNavGroups(navigation?.groups),
      userMenuItems: toStarterKitUserMenuItems(navigation?.userMenu),
    }),
    [navigation],
  )
}
