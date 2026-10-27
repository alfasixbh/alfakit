import {
  installStarterKitDocument,
  starterKitDirection,
  starterKitDocument,
  starterKitNavigation,
  toStarterKitNavGroups,
  toStarterKitUserMenuItems,
  type StarterKitNavGroup,
  type StarterKitNavigationSchema,
  type StarterKitUserMenuItem,
} from '@alfakit/core'
import { usePage } from '@inertiajs/react'
import { useEffect, useMemo } from 'react'

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

  useStarterKitDocument(props)

  return useMemo(
    () => ({
      navigation,
      groups: toStarterKitNavGroups(navigation?.groups),
      userMenuItems: toStarterKitUserMenuItems(navigation?.userMenu),
    }),
    [navigation],
  )
}

/**
 * The reading direction of the page in a starter kit app: `rtl` while the user has picked a
 * right-to-left language for the `starterKit()` panel, on AlfaKit's pages and the app's own.
 * The installer docks the kit's sidebar with it (`side`, which is physical in shadcn):
 *
 * ```tsx
 * const direction = useAlfakitDirection()
 * <Sidebar side={direction === 'rtl' ? 'right' : 'left'} …>
 * ```
 *
 * It also keeps `<html lang dir>` in step after every visit and language switch.
 */
export function useAlfakitDirection(): 'ltr' | 'rtl' {
  const props = usePage().props

  useStarterKitDocument(props)

  return starterKitDirection(props)
}

/** Keep `<html lang dir>` on the shared `alfakitDocument` (from the first page onwards). */
export function useStarterKitDocument(props: unknown): void {
  const document = starterKitDocument(props)
  const tag = document?.tag
  const direction = document?.direction

  useEffect(() => {
    installStarterKitDocument({ alfakitDocument: tag && direction ? { tag, direction } : null })
  }, [tag, direction])
}
