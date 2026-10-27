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
import { usePage } from '@inertiajs/vue3'
import { computed, watch, type ComputedRef } from 'vue'

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

  useStarterKitDocument(page)

  return computed(() => {
    const navigation = starterKitNavigation(page.props, panelId)

    return {
      navigation,
      groups: toStarterKitNavGroups(navigation?.groups),
      userMenuItems: toStarterKitUserMenuItems(navigation?.userMenu),
    }
  })
}

/**
 * The reading direction of the page in a starter kit app: `rtl` while the user has picked a
 * right-to-left language for the `starterKit()` panel, on AlfaKit's pages and the app's own.
 * The installer docks the kit's sidebar with it (`side`, which is physical in shadcn):
 *
 * ```vue
 * const direction = useAlfakitDirection()
 * <Sidebar :side="direction === 'rtl' ? 'right' : 'left'" …>
 * ```
 *
 * It also keeps `<html lang dir>` in step after every visit and language switch.
 */
export function useAlfakitDirection(): ComputedRef<'ltr' | 'rtl'> {
  const page = usePage()

  useStarterKitDocument(page)

  return computed(() => starterKitDirection(page.props))
}

/** Keep `<html lang dir>` on the shared `alfakitDocument` (from the first page onwards). */
export function useStarterKitDocument(page: { props: unknown } = usePage()): void {
  watch(
    () => {
      const document = starterKitDocument(page.props)

      return document ? `${document.tag}|${document.direction}` : ''
    },
    () => installStarterKitDocument(page.props),
    { immediate: true },
  )
}
