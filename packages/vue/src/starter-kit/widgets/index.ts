import {
  starterKitWidgets,
  type StarterKitWidgets,
  type StarterKitWidgetsSchema,
} from '@alfakit/core'
import { usePage } from '@inertiajs/vue3'
import {
  computed,
  defineAsyncComponent,
  defineComponent,
  h,
  type Component,
  type ComputedRef,
  type PropType,
} from 'vue'
import { lazyComponent } from '../../lib/lazy'
import CopilotTrigger from './CopilotTrigger.vue'
import LanguageSwitcherTrigger from './LanguageSwitcherTrigger.vue'
import NotificationsTrigger from './NotificationsTrigger.vue'
import SearchTrigger from './SearchTrigger.vue'
import TenantSwitcherTrigger from './TenantSwitcherTrigger.vue'

/**
 * Drop-in header components of starter kit mode (`Panel::starterKit()`): AlfaKit's search,
 * notifications bell, tenant switcher and language switcher in the host's own header, on every page of the
 * application. They read the shared `alfakitNavigation` prop, render a lightweight trigger
 * straight away, and load their code and the panel data once mounted (never during SSR).
 *
 * ```vue
 * <script setup lang="ts">
 * import { AlfakitCopilot, AlfakitLanguageSwitcher, AlfakitNotifications, AlfakitSearch } from '@alfakit/vue'
 * </script>
 *
 * <template>
 *   <AlfakitSearch />
 *   <AlfakitNotifications />
 *   <AlfakitCopilot />
 *   <AlfakitLanguageSwitcher />
 * </template>
 * ```
 */

/** The header components' data of a `starterKit()` panel from the shared prop, or null. */
function useStarterKitWidgets(
  panelId: () => string | undefined,
  part: keyof StarterKitWidgetsSchema,
): ComputedRef<StarterKitWidgets | null> {
  const page = usePage()

  return computed(() => starterKitWidgets(page.props, panelId(), part))
}

const LoadedSearch = lazyComponent(
  'AlfakitLoadedSearch',
  () => import('./loaded').then((module) => module.LoadedSearch),
  SearchTrigger,
)

const LoadedNotifications = lazyComponent(
  'AlfakitLoadedNotifications',
  () => import('./loaded').then((module) => module.LoadedNotifications),
  NotificationsTrigger,
)

const LoadedTenantSwitcher = lazyComponent(
  'AlfakitLoadedTenantSwitcher',
  () => import('./loaded').then((module) => module.LoadedTenantSwitcher),
  TenantSwitcherTrigger,
)

const LoadedLanguageSwitcher = lazyComponent(
  'AlfakitLoadedLanguageSwitcher',
  () => import('./loaded').then((module) => module.LoadedLanguageSwitcher),
  LanguageSwitcherTrigger,
)

const LoadedCopilot = lazyComponent(
  'AlfakitLoadedCopilot',
  () => import('./loaded').then((module) => module.LoadedCopilot),
  CopilotTrigger,
)

// Only needed while impersonating: its code loads then.
const StarterKitImpersonationBanner = defineAsyncComponent(
  () => import('./StarterKitImpersonationBanner.vue'),
)

function headerWidget(
  name: string,
  slot: string,
  part: keyof Omit<StarterKitWidgetsSchema, 'endpoint' | 'impersonation'>,
  loaded: Component,
) {
  return defineComponent({
    name,
    props: {
      /** The `starterKit()` panel to use (by default the open AlfaKit page's panel, else the first one that has this component). */
      panel: { type: String as PropType<string | undefined>, default: undefined },
    },
    setup(props) {
      const source = useStarterKitWidgets(() => props.panel, part)

      return () => {
        const value: StarterKitWidgets | null = source.value

        // While impersonating, the first header component shows the banner on host pages.
        const banner = value?.widgets.impersonation
          ? h(StarterKitImpersonationBanner, { source: value })
          : null

        if (!value?.widgets[part]) return banner

        const widget = h('span', { 'data-slot': slot, class: 'inline-flex' }, [
          h(loaded, { source: value }),
        ])

        // A single root unless the banner shows, so attributes from the app still fall through.
        return banner ? [banner, widget] : widget
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

/**
 * The AI copilot of alfasix/alfakit-ai (`AiPlugin::copilot()`): its button and chat
 * slide-over, opened with its key bindings (`mod+j`) from any page. Renders nothing for
 * guests, without the plugin's copilot, for users who may not use it and (tenancy panels)
 * outside a tenant.
 */
export const AlfakitCopilot = headerWidget(
  'AlfakitCopilot',
  'starter-kit-copilot',
  'copilot',
  LoadedCopilot,
)

/**
 * The panel's language menu (`locales()`): the current language straight away, and each
 * language in its own name once loaded. Picking one switches the panel's language (the
 * session, the cookie and `persistLocaleUsing()`) and reloads the page, so AlfaKit pages and
 * the header components show it; the host's own pages and `<html lang dir>` are the app's.
 * Renders nothing for guests or with fewer than two languages.
 */
export const AlfakitLanguageSwitcher = headerWidget(
  'AlfakitLanguageSwitcher',
  'starter-kit-language-switcher',
  'language',
  LoadedLanguageSwitcher,
)
