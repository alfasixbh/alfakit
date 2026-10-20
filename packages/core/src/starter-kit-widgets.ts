import { requestJson } from './http'
import type {
  PageSchema,
  PanelSchema,
  StarterKitDashboardWidgetsSchema,
  StarterKitNavigationSchema,
  StarterKitWidgetsSchema,
} from './schema/panel'
import type { StandaloneComponentSchema } from './schema/standalone'
import type { WidgetsBlock } from './schema/widgets'
import { SHORTCUT_IDS, shortcuts } from './shortcuts'
import { starterKitNavigations } from './starter-kit'

/**
 * The drop-in header components of starter kit mode: `<AlfakitSearch />` (the command
 * palette and global search), `<AlfakitNotifications />` (the database notifications bell)
 * and `<AlfakitTenantSwitcher />`. They render on every page of the host application, from
 * the `widgets` of the shared `alfakitNavigation` prop; their code and the panel data
 * (translations, endpoints, the palette, realtime) load the first time one of them renders.
 * Shared by the three renderers.
 */

/** One starter kit panel's navigation with its header components' data. */
export interface StarterKitWidgets {
  navigation: StarterKitNavigationSchema
  widgets: StarterKitWidgetsSchema
}

/**
 * The header components' data of a `starterKit()` panel (the first one with any unless
 * `panelId` is given), or null for guests and pages of other panels.
 */
export function starterKitWidgets(props: unknown, panelId?: string): StarterKitWidgets | null {
  const navigation = starterKitNavigations(props).find(
    (entry) => entry.widgets !== undefined && (panelId === undefined || entry.id === panelId),
  )

  return navigation?.widgets ? { navigation, widgets: navigation.widgets } : null
}

/** Whether the open page is one of the panel's own (it carries the `alfakit` prop). */
export function isAlfakitPage(props: unknown): boolean {
  return (props as { alfakit?: unknown } | null | undefined)?.alfakit !== undefined
}

// ---------------------------------------------------------------- Panel data

// Loaded once per endpoint (the tenant-scoped one inside a tenant) for the browser session;
// Inertia visits keep it, a full page load starts over.
const requests = new Map<string, Promise<PanelSchema>>()
const panels = new Map<string, PanelSchema>()

/** Load (once) the panel data the header components render with. */
export function loadStarterKitPanel(endpoint: string): Promise<PanelSchema> {
  let request = requests.get(endpoint)

  if (!request) {
    request = requestJson<PanelSchema>(endpoint).then(
      (panel) => {
        panels.set(endpoint, panel)

        return panel
      },
      (error: unknown) => {
        // A failed request (offline, expired session) is retried by the next render.
        requests.delete(endpoint)
        throw error
      },
    )
    requests.set(endpoint, request)
  }

  return request
}

/** The panel data once loaded, or null (so remounts render straight away). */
export function loadedStarterKitPanel(endpoint: string): PanelSchema | null {
  return panels.get(endpoint) ?? null
}

/** @internal Forget the loaded panel data (tests). */
export function resetStarterKitPanels(): void {
  requests.clear()
  panels.clear()
}

/**
 * The panel the header components render with: the loaded panel data with the fresh
 * shared prop (navigation, unread count, tenants). Outside Alfakit's own chrome the host
 * owns the colour scheme and there is no shortcuts overlay, and panel commands and page
 * actions need an Alfakit page (its token and modals), so the palette lists search
 * results, navigation, "create" links and recent records.
 */
export function starterKitWidgetsPanel(base: PanelSchema, source: StarterKitWidgets): PanelSchema {
  const { navigation, widgets } = source
  const { databaseNotifications, tenancy, globalSearch, commandPalette } = base

  return {
    ...base,
    navigation: navigation.groups,
    darkMode: { enabled: false, forced: false, switcher: false },
    keyboardShortcuts: false,
    globalSearch: globalSearch && { ...globalSearch, position: undefined },
    commandPalette: commandPalette && { ...commandPalette, commands: [] },
    databaseNotifications: databaseNotifications && {
      ...databaseNotifications,
      unreadCount: widgets.notifications?.unreadCount ?? databaseNotifications.unreadCount,
      position: undefined,
    },
    tenancy: tenancy && {
      ...tenancy,
      current: widgets.tenancy ? (widgets.tenancy.current ?? null) : tenancy.current,
      tenants: widgets.tenancy?.tenants ?? tenancy.tenants,
    },
  }
}

/** The `page` the header components render with: none of the panel's (`usePageSchema()`). */
export function starterKitWidgetsPage(): PageSchema {
  return { class: '', layout: 'app', title: '', content: [], token: '' }
}

// ---------------------------------------------------------------- Search shortcut

let searchRequested = false

/**
 * Register the palette's key bindings before its code has loaded: pressing them (or
 * clicking the field) records the request, and the palette opens once it has loaded. It
 * uses the palette's shortcut id, so the loaded palette replaces this registration and
 * the keys are bound once, however many search components the page renders.
 */
export function registerStarterKitSearchShortcut(
  keys: string[],
  label: string,
  onRequest: () => void,
): () => void {
  return shortcuts.register({
    id: SHORTCUT_IDS.palette,
    keys,
    label,
    group: 'general',
    essential: true,
    handler: () => {
      requestStarterKitSearch()
      onRequest()
    },
  })
}

/** Ask for the palette to open as soon as it has loaded. */
export function requestStarterKitSearch(): void {
  searchRequested = true
}

/**
 * Open the loaded palette when it was asked for before it loaded (call once it mounted):
 * true when it did.
 */
export function openRequestedStarterKitSearch(): boolean {
  if (!searchRequested) return false

  searchRequested = false

  return shortcuts.trigger(SHORTCUT_IDS.palette)
}

// ---------------------------------------------------------------- Dashboard widgets

/**
 * The dashboard widgets of a `starterKit()` panel on the host's dashboard
 * (`<AlfakitWidgets />`, the `alfakitWidgets` prop): a standalone widgets payload bound to
 * the panel, the first panel's unless `panelId` is given. Null on other pages, for guests,
 * users who may not open the panel and panels without widgets.
 */
export function starterKitDashboardWidgets(
  props: unknown,
  panelId?: string,
): StandaloneComponentSchema | null {
  const value = (props as { alfakitWidgets?: unknown } | null | undefined)?.alfakitWidgets

  if (!Array.isArray(value)) return null

  const entry = (value as StarterKitDashboardWidgetsSchema[]).find(
    (item) => panelId === undefined || item.id === panelId,
  )

  return entry?.component ?? null
}

/** How many widgets a dashboard widgets payload has (placeholders before its code loads). */
export function standaloneWidgetCount(component: StandaloneComponentSchema): number {
  return component.content.reduce(
    (total, block) =>
      total + (block.type === 'Widgets' ? (block as WidgetsBlock).widgets.length : 0),
    0,
  )
}
