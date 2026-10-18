import {
  starterKitWidgets,
  type StarterKitWidgets,
  type StarterKitWidgetsSchema,
} from '@alfakit/core'
import { usePage } from '@inertiajs/vue3'
import { computed, defineComponent, h, type Component, type ComputedRef, type PropType } from 'vue'
import { lazyComponent } from '../../lib/lazy'
import NotificationsTrigger from './NotificationsTrigger.vue'
import SearchTrigger from './SearchTrigger.vue'
import TenantSwitcherTrigger from './TenantSwitcherTrigger.vue'

/**
 * Drop-in header components of starter kit mode (`Panel::starterKit()`): AlfaKit's search,
 * notifications bell and tenant switcher in the host's own header, on every page of the
 * application. They read the shared `alfakitNavigation` prop, render a lightweight trigger
 * straight away, and load their code and the panel data once mounted (never during SSR).
 *
 * ```vue
 * <script setup lang="ts">
 * import { AlfakitNotifications, AlfakitSearch } from '@alfakit/vue'
 * </script>
 *
 * <template>
 *   <AlfakitSearch />
 *   <AlfakitNotifications />
 * </template>
 * ```
 */

/** The header components' data of a `starterKit()` panel from the shared prop, or null. */
function useStarterKitWidgets(
  panelId: () => string | undefined,
): ComputedRef<StarterKitWidgets | null> {
  const page = usePage()

  return computed(() => starterKitWidgets(page.props, panelId()))
}

const LoadedSearch = lazyComponent(
  'AlfakitLoadedSearch',
  () => import('./LoadedSearch.vue').then((module) => module.default),
  SearchTrigger,
)

const LoadedNotifications = lazyComponent(
  'AlfakitLoadedNotifications',
  () => import('./LoadedNotifications.vue').then((module) => module.default),
  NotificationsTrigger,
)

const LoadedTenantSwitcher = lazyComponent(
  'AlfakitLoadedTenantSwitcher',
  () => import('./LoadedTenantSwitcher.vue').then((module) => module.default),
  TenantSwitcherTrigger,
)

function headerWidget(
  name: string,
  slot: string,
  part: keyof Omit<StarterKitWidgetsSchema, 'endpoint'>,
  loaded: Component,
) {
  return defineComponent({
    name,
    props: {
      /** The `starterKit()` panel to use (the first one by default). */
      panel: { type: String as PropType<string | undefined>, default: undefined },
    },
    setup(props) {
      const source = useStarterKitWidgets(() => props.panel)

      return () => {
        const value: StarterKitWidgets | null = source.value

        return value?.widgets[part]
          ? h('span', { 'data-slot': slot, class: 'inline-flex' }, [h(loaded, { source: value })])
          : null
      }
    },
  })
}

/**
 * AlfaKit's command palette and global search: the search field opens it, and so do the
 * panel's key bindings (⌘K / Ctrl+K by default), registered once for the page. Renders
 * nothing for guests or without global search and a command palette.
 */
export const AlfakitSearch = headerWidget(
  'AlfakitSearch',
  'starter-kit-search',
  'search',
  LoadedSearch,
)

/**
 * The bell with the user's database notifications (`databaseNotifications()`), polling and
 * realtime updates as in the panel. Renders nothing for guests or without them.
 */
export const AlfakitNotifications = headerWidget(
  'AlfakitNotifications',
  'starter-kit-notifications',
  'notifications',
  LoadedNotifications,
)

/**
 * The tenant switcher of a tenancy panel: the current tenant inside the panel, or a menu
 * to choose one on the host's own pages. Renders nothing for guests or other panels.
 */
export const AlfakitTenantSwitcher = headerWidget(
  'AlfakitTenantSwitcher',
  'starter-kit-tenant-switcher',
  'tenancy',
  LoadedTenantSwitcher,
)
