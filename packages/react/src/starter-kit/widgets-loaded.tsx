import {
  ActionRunner,
  ComponentRegistry,
  Translator,
  initials,
  isAlfakitPage,
  loadStarterKitPanel,
  loadedStarterKitPanel,
  openRequestedStarterKitSearch,
  starterKitWidgetsPage,
  starterKitWidgetsPanel,
  tenantNameText,
  type PanelSchema,
  type StarterKitWidgets,
} from '@alfakit/core'
import { router, usePage } from '@inertiajs/react'
import { ChevronsUpDownIcon, PlusIcon } from 'lucide-react'
import { Direction } from 'radix-ui'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NotificationsMenu } from '../components/notifications/notifications-menu'
import { RealtimeNotifications } from '../components/notifications/realtime-notifications'
import { GlobalSearch } from '../components/panel/global-search'
import { TenantName } from '../components/panel/nav-label'
import { TenantMenu } from '../components/panel/tenant-menu'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { TooltipProvider } from '../components/ui/tooltip'
import {
  AlfakitProvider,
  StandaloneProvider,
  useT,
  type AlfakitContextValue,
  type AnyComponent,
} from '../context'
import { Icon } from '../lib/icons'
import {
  NotificationsTrigger,
  SearchTrigger,
  TenantSwitcherTrigger,
  type WidgetProps,
} from './widgets-triggers'

/**
 * The loaded header components of starter kit mode: the panel's own search palette,
 * notifications menu and tenant menu, rendered outside Alfakit pages with the panel data
 * from `widgets.endpoint`. This module only loads in the browser.
 */

// One context for the browser session: its own translator (the panel's strings), an empty
// registry (only `panel:icon` overrides are looked up here) and an idle action runner.
let widgetsContext: AlfakitContextValue | null = null

function useWidgetsContext(panel: PanelSchema): AlfakitContextValue {
  widgetsContext ??= {
    registry: new ComponentRegistry<AnyComponent>(),
    pages: {},
    translator: new Translator(),
    actions: new ActionRunner({ endpoints: { action: '', modal: '' } }),
  }

  widgetsContext.translator.setTranslations(panel.translations ?? {})
  widgetsContext.translator.setLocale(panel.localization?.tag ?? 'en')

  return widgetsContext
}

/** The panel the components render with, once its data has loaded (null until then). */
function useWidgetsPanel(source: StarterKitWidgets): PanelSchema | null {
  const endpoint = source.widgets.endpoint
  const [loaded, setLoaded] = useState(() => loadedStarterKitPanel(endpoint))
  const base = loadedStarterKitPanel(endpoint) ?? loaded

  useEffect(() => {
    let active = true

    // Another endpoint (a tenant switch) loads its own panel data.
    void loadStarterKitPanel(endpoint).then(
      (panel) => active && setLoaded(panel),
      () => {},
    )

    return () => {
      active = false
    }
  }, [endpoint])

  const { navigation, widgets } = source

  return useMemo(
    () => (base ? starterKitWidgetsPanel(base, { navigation, widgets }) : null),
    [base, navigation, widgets],
  )
}

function WidgetShell({ panel, children }: { panel: PanelSchema; children: ReactNode }) {
  const context = useWidgetsContext(panel)
  const page = useMemo(() => starterKitWidgetsPage(), [])

  return (
    <AlfakitProvider value={context}>
      <StandaloneProvider value={{ panel, page }}>
        <Direction.Provider dir={panel.localization?.direction ?? 'ltr'}>
          <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
        </Direction.Provider>
      </StandaloneProvider>
    </AlfakitProvider>
  )
}

/** The panel's command palette and global search. */
export function LoadedSearch({ source }: WidgetProps) {
  const panel = useWidgetsPanel(source)

  // A click or the key bindings before the palette loaded open it now (after its own
  // effects registered the shortcut).
  useEffect(() => {
    if (panel) openRequestedStarterKitSearch()
  }, [panel])

  if (!panel) return <SearchTrigger source={source} />

  return (
    <WidgetShell panel={panel}>
      <GlobalSearch />
    </WidgetShell>
  )
}

/** The notifications bell, with realtime notifications on the host's own pages. */
export function LoadedNotifications({ source }: WidgetProps) {
  const panel = useWidgetsPanel(source)
  // Alfakit pages subscribe to realtime notifications themselves.
  const alfakitPage = isAlfakitPage(usePage().props)

  if (!panel) return <NotificationsTrigger source={source} />

  return (
    <WidgetShell panel={panel}>
      <NotificationsMenu />
      {!alfakitPage && <RealtimeNotifications />}
    </WidgetShell>
  )
}

/** The panel's tenant menu inside a tenant, a menu to choose one elsewhere. */
export function LoadedTenantSwitcher({ source }: WidgetProps) {
  const panel = useWidgetsPanel(source)

  if (!panel) return <TenantSwitcherTrigger source={source} />

  return (
    <WidgetShell panel={panel}>
      {panel.tenancy?.current ? <TenantMenu variant="topbar" /> : <TenantChooser panel={panel} />}
    </WidgetShell>
  )
}

/** The user's tenants on a page outside the panel (no current tenant). */
function TenantChooser({ panel }: { panel: PanelSchema }) {
  const t = useT()
  const tenancy = panel.tenancy

  if (!tenancy || (tenancy.tenants.length === 0 && !tenancy.registrationUrl)) return null

  const label = t('starter_kit.choose_tenant', {}, 'Choose a tenant')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-slot="tenant-menu"
          className="hover:bg-accent data-[state=open]:bg-accent inline-flex h-9 max-w-60 shrink-0 items-center gap-2 rounded-md px-2 text-sm font-medium"
        >
          <span className="sr-only lg:not-sr-only lg:truncate">{label}</span>
          <Icon
            name="alfakit::panels.tenant-menu.toggle-button"
            fallback={ChevronsUpDownIcon}
            className="text-muted-foreground size-4 shrink-0"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 rounded-lg" side="bottom" align="end" sideOffset={4}>
        {tenancy.tenants.length > 0 && (
          <DropdownMenuLabel className="text-muted-foreground text-xs">{label}</DropdownMenuLabel>
        )}
        {tenancy.tenants.map((tenant) => (
          <DropdownMenuItem key={String(tenant.id)} onSelect={() => router.visit(tenant.url)}>
            <Avatar className="size-6 rounded-sm">
              {tenant.avatar && <AvatarImage src={tenant.avatar} alt="" />}
              <AvatarFallback className="rounded-sm text-[10px]">
                {initials(tenantNameText(tenant))}
              </AvatarFallback>
            </Avatar>
            <TenantName tenant={tenant} className="flex-1 truncate" />
          </DropdownMenuItem>
        ))}
        {tenancy.registrationUrl && (
          <>
            {tenancy.tenants.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem onSelect={() => router.visit(tenancy.registrationUrl!)}>
              <Icon name="alfakit::panels.tenant-menu.registration-button" fallback={PlusIcon} />
              {t('tenancy.register', {}, 'New')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
