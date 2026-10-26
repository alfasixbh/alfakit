import {
  ActionRunner,
  ComponentRegistry,
  STARTER_KIT_TOASTER_ID,
  Translator,
  initials,
  isAlfakitPage,
  loadStarterKitPanel,
  loadedStarterKitPanel,
  openRequestedStarterKitSearch,
  overlayPlacementDirection,
  resolveToastPosition,
  showsLanguageSwitcher,
  starterKitCopilot,
  starterKitPanelLocale,
  starterKitWidgetsPage,
  starterKitWidgetsPanel,
  takeRequestedStarterKitCopilot,
  takeRequestedStarterKitLanguages,
  tenantNameText,
  type PanelSchema,
  type StarterKitWidgets,
  type ToastPosition,
} from '@alfakit/core'
import { router, usePage } from '@inertiajs/react'
import { ChevronsUpDownIcon, LanguagesIcon, PlusIcon } from 'lucide-react'
import { Direction } from 'radix-ui'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AiCopilot } from '../components/ai/copilot'
import { setToasterId } from '../components/notifications/flash-toasts'
import { NotificationsMenu } from '../components/notifications/notifications-menu'
import { RealtimeNotifications } from '../components/notifications/realtime-notifications'
import { GlobalSearch } from '../components/panel/global-search'
import { LocaleOptions } from '../components/panel/locale-switcher'
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
import { Toaster } from '../components/ui/sonner'
import { TooltipProvider } from '../components/ui/tooltip'
import {
  AlfakitProvider,
  StandaloneProvider,
  useLocalization,
  useRegistry,
  useT,
  type AlfakitContextValue,
  type AnyComponent,
} from '../context'
import { Icon } from '../lib/icons'
import { ensureFlashToasts } from '../standalone/runtime'
import { claimToaster, hasToaster } from '../standalone/toaster-claims'
import {
  CopilotTrigger,
  LanguageSwitcherTrigger,
  NotificationsTrigger,
  SearchTrigger,
  TenantSwitcherTrigger,
  languageTriggerClasses,
  type WidgetProps,
} from './widgets-triggers'

/**
 * The loaded header components of starter kit mode: the panel's own search palette,
 * notifications menu, tenant menu and language menu, rendered outside Alfakit pages with
 * the panel data from `widgets.endpoint`. This module only loads in the browser.
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

/**
 * The panel the components render with, once its data has loaded (null until then). It is
 * loaded per endpoint (a tenant switch) and language (a language switch), so the components
 * follow a switch instead of keeping the old language's strings.
 */
function useWidgetsPanel(source: StarterKitWidgets): PanelSchema | null {
  const endpoint = source.widgets.endpoint
  const locale = starterKitPanelLocale(source)
  const [loaded, setLoaded] = useState(() => loadedStarterKitPanel(endpoint, locale))
  // Until the new language's data arrives, not the old language's.
  const current =
    loaded && (locale === undefined || loaded.localization?.code === locale) ? loaded : null
  const base = loadedStarterKitPanel(endpoint, locale) ?? current

  useEffect(() => {
    let active = true

    void loadStarterKitPanel(endpoint, locale).then(
      (panel) => active && setLoaded(panel),
      () => {},
    )

    return () => {
      active = false
    }
  }, [endpoint, locale])

  const { navigation, widgets } = source

  return useMemo(
    () => (base ? starterKitWidgetsPanel(base, { navigation, widgets }) : null),
    [base, navigation, widgets],
  )
}

/**
 * AlfaKit's toaster on a host page (as `<AlfakitToaster>`, without its standalone context):
 * Alfakit's toasts go to it, and so do flashed notifications.
 */
function HostToaster({ position, dir }: { position?: ToastPosition; dir: 'ltr' | 'rtl' }) {
  const registry = useRegistry()

  useEffect(() => {
    ensureFlashToasts(registry)
  }, [registry])

  useEffect(() => {
    setToasterId(STARTER_KIT_TOASTER_ID)

    return () => setToasterId(undefined)
  }, [])

  return (
    <Toaster
      id={STARTER_KIT_TOASTER_ID}
      position={resolveToastPosition(position, dir)}
      dir={dir}
      richColors
      closeButton
    />
  )
}

/**
 * On the host's own pages no AlfaKit toaster is mounted, so the first loaded header
 * component renders one: the push toggle's and the PWA's messages show there too (W-S1-03).
 * AlfaKit pages (`AlfakitRoot`) and standalone components claim it themselves; the check
 * runs after every component's effects, and again after each visit.
 */
function useOwnsHostToaster(): boolean {
  const alfakitPage = isAlfakitPage(usePage().props)
  const [owns, setOwns] = useState(false)

  useEffect(() => {
    if (alfakitPage) return undefined

    let release: (() => void) | null = null
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled || hasToaster()) return

      release = claimToaster()
      setOwns(true)
    })

    return () => {
      cancelled = true
      release?.()
      setOwns(false)
    }
  }, [alfakitPage])

  return owns && !alfakitPage
}

function WidgetShell({ panel, children }: { panel: PanelSchema; children: ReactNode }) {
  const context = useWidgetsContext(panel)
  const page = useMemo(() => starterKitWidgetsPage(), [])
  const ownsToaster = useOwnsHostToaster()
  const direction = panel.localization?.direction ?? 'ltr'

  return (
    <AlfakitProvider value={context}>
      <StandaloneProvider value={{ panel, page }}>
        <Direction.Provider dir={direction}>
          <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
        </Direction.Provider>
        {/* In the body, not in the header (a header with a backdrop filter would hold its
            fixed position), placed in the document's direction as on AlfaKit pages. */}
        {ownsToaster &&
          createPortal(
            <HostToaster
              position={panel.toastPosition}
              dir={overlayPlacementDirection(direction, true)}
            />,
            document.body,
          )}
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

/** The AI copilot (the panel pages' `topbar.end` slot component). */
export function LoadedCopilot({ source }: WidgetProps) {
  const panel = useWidgetsPanel(source)
  // A click or the key bindings before the copilot loaded open it at once.
  const [autoOpen] = useState(() => takeRequestedStarterKitCopilot())
  const component = useMemo(() => (panel ? starterKitCopilot(panel) : null), [panel])

  if (!panel) return <CopilotTrigger source={source} />

  if (!component) return null

  return (
    <WidgetShell panel={panel}>
      <AiCopilot component={component} autoOpen={autoOpen || takeRequestedStarterKitCopilot()} />
    </WidgetShell>
  )
}

/**
 * The panel's language menu (its languages in their own names, `LocaleOptions`): picking
 * one posts to the panel's locale endpoint and reloads the page in it. Nothing without a
 * language switcher with two or more languages.
 */
export function LoadedLanguageSwitcher({ source }: WidgetProps) {
  const panel = useWidgetsPanel(source)

  if (!panel) return <LanguageSwitcherTrigger source={source} />

  if (!showsLanguageSwitcher(panel.localization, 'auth')) return null

  return (
    <WidgetShell panel={panel}>
      <LanguageMenu />
    </WidgetShell>
  )
}

function LanguageMenu() {
  const t = useT()
  const localization = useLocalization()
  const [open, setOpen] = useState(false)
  // Taken once per mount (effects run twice in StrictMode).
  const requested = useRef<boolean | null>(null)

  // A click on the trigger before the menu loaded opens it once mounted: a frame later, as
  // the menu closes again when it opens while focus is still on the replaced button.
  useEffect(() => {
    requested.current ??= takeRequestedStarterKitLanguages()

    if (!requested.current) return

    const frame = requestAnimationFrame(() => setOpen(true))

    return () => cancelAnimationFrame(frame)
  }, [])
  const label = t('change_language', {}, 'Change language')

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-slot="language-switcher-trigger"
          aria-label={label}
          title={label}
          className={languageTriggerClasses}
        >
          <LanguagesIcon className="size-4" aria-hidden="true" />
          <span lang={localization.tag} dir={localization.direction} className="hidden sm:inline">
            {localization.label}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <LocaleOptions />
      </DropdownMenuContent>
    </DropdownMenu>
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
              {tenancy.registrationLabel ?? t('tenancy.register', {}, 'New')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
