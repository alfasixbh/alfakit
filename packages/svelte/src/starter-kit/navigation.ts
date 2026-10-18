import {
  starterKitNavigation,
  toStarterKitNavGroups,
  type StarterKitNavGroup,
  type StarterKitNavigationSchema,
} from '@alfakit/core'
import { page } from '@inertiajs/svelte'

// Its own module, away from `createStarterKitLayout()`: the host's sidebar imports it on every
// page, and it must not pull the panel runtime into the host's main chunk.

export interface AlfakitNavigation {
  /** The panel's navigation as the server shared it, or null for guests. */
  readonly navigation: StarterKitNavigationSchema | null
  /** Its groups as plain items (`title`, `href`, `icon`, `isActive`, `badge`, `children`). */
  readonly groups: StarterKitNavGroup[]
}

/**
 * The navigation of a `starterKit()` panel (the first one unless `panelId` is given), for the
 * host's sidebar. Every Inertia page of the application carries it, so the host's own pages
 * list the panel's resources too. The getters read the current page, so they update after
 * each visit when read in markup or `$derived`.
 *
 * ```svelte
 * const navigation = useAlfakitNavigation()
 * // {#each navigation.groups as group}
 * ```
 */
export function useAlfakitNavigation(panelId?: string): AlfakitNavigation {
  return {
    get navigation() {
      return starterKitNavigation(page.props, panelId)
    },
    get groups() {
      return toStarterKitNavGroups(starterKitNavigation(page.props, panelId)?.groups)
    },
  }
}
