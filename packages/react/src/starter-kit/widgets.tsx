import { starterKitWidgets, type StarterKitWidgets } from '@alfakit/core'
import { usePage } from '@inertiajs/react'
import { lazyComponent } from '../lib/lazy'
import {
  NotificationsTrigger,
  SearchTrigger,
  TenantSwitcherTrigger,
  type WidgetProps,
} from './widgets-triggers'

/**
 * Drop-in header components of starter kit mode (`Panel::starterKit()`): AlfaKit's search,
 * notifications bell and tenant switcher in the host's own header, on every page of the
 * application. They read the shared `alfakitNavigation` prop, render a lightweight trigger
 * straight away, and load their code and the panel data the first time they render
 * (in the browser, never during SSR).
 *
 * ```tsx
 * import { AlfakitNotifications, AlfakitSearch } from '@alfakit/react'
 *
 * <AlfakitSearch />
 * <AlfakitNotifications />
 * ```
 */
export interface AlfakitHeaderWidgetProps {
  /** The `starterKit()` panel to use (the first one by default). */
  panel?: string
}

const load = () => import('./widgets-loaded')

const LoadedSearch = lazyComponent<WidgetProps>(
  () => load().then((module) => module.LoadedSearch),
  (props) => <SearchTrigger {...props} onLoad={preloadSearch} />,
)

function preloadSearch() {
  void LoadedSearch.preload()
}

const LoadedNotifications = lazyComponent<WidgetProps>(
  () => load().then((module) => module.LoadedNotifications),
  (props) => <NotificationsTrigger {...props} />,
)

const LoadedTenantSwitcher = lazyComponent<WidgetProps>(
  () => load().then((module) => module.LoadedTenantSwitcher),
  (props) => <TenantSwitcherTrigger {...props} />,
)

function useWidgets(panelId: string | undefined): StarterKitWidgets | null {
  return starterKitWidgets(usePage().props, panelId)
}

/**
 * AlfaKit's command palette and global search: the search field opens it, and so do the
 * panel's key bindings (⌘K / Ctrl+K by default), registered once for the page. Renders
 * nothing for guests or without global search and a command palette.
 */
export function AlfakitSearch({ panel }: AlfakitHeaderWidgetProps = {}) {
  const source = useWidgets(panel)

  if (!source?.widgets.search) return null

  return (
    <span data-slot="starter-kit-search" className="inline-flex">
      <LoadedSearch source={source} />
    </span>
  )
}

/**
 * The bell with the user's database notifications (`databaseNotifications()`), polling and
 * realtime updates as in the panel. Renders nothing for guests or without database
 * notifications.
 */
export function AlfakitNotifications({ panel }: AlfakitHeaderWidgetProps = {}) {
  const source = useWidgets(panel)

  if (!source?.widgets.notifications) return null

  return (
    <span data-slot="starter-kit-notifications" className="inline-flex">
      <LoadedNotifications source={source} />
    </span>
  )
}

/**
 * The tenant switcher of a tenancy panel: the current tenant inside the panel, or a menu
 * to choose one on the host's own pages. Renders nothing for guests or other panels.
 */
export function AlfakitTenantSwitcher({ panel }: AlfakitHeaderWidgetProps = {}) {
  const source = useWidgets(panel)

  if (!source?.widgets.tenancy) return null

  return (
    <span data-slot="starter-kit-tenant-switcher" className="inline-flex">
      <LoadedTenantSwitcher source={source} />
    </span>
  )
}
