import {
  isAlfakitPage,
  starterKitWidgets,
  type StarterKitWidgets,
  type StarterKitWidgetsSchema,
} from '@alfakit/core'
import { usePage } from '@inertiajs/react'
import { lazy, Suspense } from 'react'
import { lazyComponent } from '../lib/lazy'
import {
  CopilotTrigger,
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
 * import { AlfakitCopilot, AlfakitNotifications, AlfakitSearch } from '@alfakit/react'
 *
 * <AlfakitSearch />
 * <AlfakitNotifications />
 * <AlfakitCopilot />
 * ```
 */
export interface AlfakitHeaderWidgetProps {
  /** The `starterKit()` panel to use (by default the open AlfaKit page's panel, else the first one that has this component). */
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

const LoadedCopilot = lazyComponent<WidgetProps>(
  () => load().then((module) => module.LoadedCopilot),
  (props) => <CopilotTrigger {...props} onLoad={preloadCopilot} />,
)

function preloadCopilot() {
  void LoadedCopilot.preload()
}

// Only needed while impersonating: its code loads then (and never on AlfaKit pages).
const LazyImpersonationBanner = lazy(() => import('./impersonation-banner'))

/** While impersonating, the first header component shows the banner on host pages. */
function StarterKitImpersonationBanner({ source }: { source: StarterKitWidgets | null }) {
  const props = usePage().props
  const impersonation = source?.widgets.impersonation

  if (!impersonation || isAlfakitPage(props)) return null

  return (
    <Suspense fallback={null}>
      <LazyImpersonationBanner impersonation={impersonation} />
    </Suspense>
  )
}

function useWidgets(
  panelId: string | undefined,
  part: keyof StarterKitWidgetsSchema,
): StarterKitWidgets | null {
  return starterKitWidgets(usePage().props, panelId, part)
}

/**
 * AlfaKit's command palette and global search: the search field opens it, and so do the
 * panel's key bindings (⌘K / Ctrl+K by default), registered once for the page. Renders
 * nothing for guests or without global search and a command palette.
 */
export function AlfakitSearch({ panel }: AlfakitHeaderWidgetProps = {}) {
  const source = useWidgets(panel, 'search')

  const banner = <StarterKitImpersonationBanner source={source} />

  if (!source?.widgets.search) return banner

  return (
    <>
      {banner}
      <span data-slot="starter-kit-search" className="inline-flex">
        <LoadedSearch source={source} />
      </span>
    </>
  )
}

/**
 * The bell with the user's database notifications (`databaseNotifications()`), polling and
 * realtime updates as in the panel. Renders nothing for guests or without database
 * notifications.
 */
export function AlfakitNotifications({ panel }: AlfakitHeaderWidgetProps = {}) {
  const source = useWidgets(panel, 'notifications')

  const banner = <StarterKitImpersonationBanner source={source} />

  if (!source?.widgets.notifications) return banner

  return (
    <>
      {banner}
      <span data-slot="starter-kit-notifications" className="inline-flex">
        <LoadedNotifications source={source} />
      </span>
    </>
  )
}

/**
 * The tenant switcher of a tenancy panel: the current tenant inside the panel, or a menu
 * to choose one on the host's own pages. Renders nothing for guests or other panels.
 */
export function AlfakitTenantSwitcher({ panel }: AlfakitHeaderWidgetProps = {}) {
  const source = useWidgets(panel, 'tenancy')

  const banner = <StarterKitImpersonationBanner source={source} />

  if (!source?.widgets.tenancy) return banner

  return (
    <>
      {banner}
      <span data-slot="starter-kit-tenant-switcher" className="inline-flex">
        <LoadedTenantSwitcher source={source} />
      </span>
    </>
  )
}

/**
 * The AI copilot of alfasix/alfakit-ai (`AiPlugin::copilot()`): its button and chat
 * slide-over, opened with its key bindings (`mod+j`) from any page. Renders nothing for
 * guests, without the plugin's copilot, for users who may not use it and (tenancy panels)
 * outside a tenant.
 */
export function AlfakitCopilot({ panel }: AlfakitHeaderWidgetProps = {}) {
  const source = useWidgets(panel, 'copilot')

  const banner = <StarterKitImpersonationBanner source={source} />

  if (!source?.widgets.copilot) return banner

  return (
    <>
      {banner}
      <span data-slot="starter-kit-copilot" className="inline-flex">
        <LoadedCopilot source={source} />
      </span>
    </>
  )
}
