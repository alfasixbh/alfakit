import { requestJson } from './http'
import type { AiCopilotSchema } from './schema/ai'
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
import { preferCurrentStarterKitPanel, starterKitNavigations } from './starter-kit'

/**
 * The drop-in header components of starter kit mode: `<AlfakitSearch />` (the command
 * palette and global search), `<AlfakitNotifications />` (the database notifications bell),
 * `<AlfakitTenantSwitcher />`, `<AlfakitLanguageSwitcher />` and `<AlfakitCopilot />` (the AI
 * plugin's copilot). They render
 * on every page of the host application, from the `widgets` of the shared
 * `alfakitNavigation` prop; their code and the panel data (translations, endpoints, the
 * palette, realtime) load the first time one of them renders.
 * Shared by the three renderers.
 */

/** One starter kit panel's navigation with its header components' data. */
export interface StarterKitWidgets {
  navigation: StarterKitNavigationSchema
  widgets: StarterKitWidgetsSchema
}

/**
 * The header components' data of a `starterKit()` panel, or null for guests and pages of
 * other panels. Without `panelId`: the open AlfaKit page's panel, else the first one with
 * any; with `part` (`'tenancy'` for the tenant switcher), the first panel that has that
 * part when the preferred one hasn't, so a team workspace on a second panel still gets its
 * switcher on the host's own pages.
 */
export function starterKitWidgets(
  props: unknown,
  panelId?: string,
  part?: keyof StarterKitWidgetsSchema,
): StarterKitWidgets | null {
  const entries = preferCurrentStarterKitPanel(starterKitNavigations(props), props).filter(
    (entry) => entry.widgets !== undefined && (panelId === undefined || entry.id === panelId),
  )
  const navigation =
    (part !== undefined && panelId === undefined
      ? entries.find((entry) => entry.widgets?.[part] !== undefined)
      : undefined) ?? entries[0]

  return navigation?.widgets ? { navigation, widgets: navigation.widgets } : null
}

/** Whether the open page is one of the panel's own (it carries the `alfakit` prop). */
export function isAlfakitPage(props: unknown): boolean {
  return (props as { alfakit?: unknown } | null | undefined)?.alfakit !== undefined
}

// ---------------------------------------------------------------- Panel data

// Loaded once per endpoint and language (the tenant-scoped endpoint inside a tenant) for the
// browser session; Inertia visits keep it, a full page load starts over.
const requests = new Map<string, Promise<PanelSchema>>()
const panels = new Map<string, PanelSchema>()

/**
 * The language the panel data is loaded in: the current language of the shared prop
 * (`widgets.language`, panels with a language switcher). After a language switch the prop
 * names the new one, so the header components load the panel data (translations, the
 * reading direction) again instead of keeping the old language's.
 */
export function starterKitPanelLocale(source: StarterKitWidgets): string | undefined {
  return source.widgets.language?.current.code
}

function panelKey(endpoint: string, locale: string | undefined): string {
  return locale === undefined ? endpoint : `${endpoint}#${locale}`
}

/** Load (once per language) the panel data the header components render with. */
export function loadStarterKitPanel(endpoint: string, locale?: string): Promise<PanelSchema> {
  const key = panelKey(endpoint, locale)
  let request = requests.get(key)

  if (!request) {
    request = requestJson<unknown>(endpoint)
      .then((panel) => {
        // A redirect to the sign-in page (expired or ended session) answers HTML, not the
        // panel: refuse it, so the components keep their trigger instead of crashing.
        if (!isPanelData(panel)) {
          throw new Error(`The starter kit endpoint ${endpoint} did not answer the panel data.`)
        }

        panels.set(key, panel)

        return panel
      })
      .catch((error: unknown) => {
        // A failed request (offline, expired session) is retried by the next render.
        requests.delete(key)
        throw error
      })
    requests.set(key, request)
  }

  return request
}

function isPanelData(value: unknown): value is PanelSchema {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { endpoints?: unknown }).endpoints === 'object' &&
    (value as { endpoints?: unknown }).endpoints !== null
  )
}

/** The panel data once loaded (in `locale`, when given), or null (so remounts render straight away). */
export function loadedStarterKitPanel(endpoint: string, locale?: string): PanelSchema | null {
  return panels.get(panelKey(endpoint, locale)) ?? null
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

// ---------------------------------------------------------------- Copilot

/** The copilot's shortcut id (the loaded `ai:copilot` component registers the same one). */
export const STARTER_KIT_COPILOT_SHORTCUT = 'ai.copilot'

let copilotRequested = false

/**
 * Register the copilot's key bindings (`mod+j`) before its code has loaded: pressing them
 * (or clicking the button) records the request, and the copilot opens once it has loaded.
 * The loaded copilot registers the same id, so it replaces this registration.
 */
export function registerStarterKitCopilotShortcut(
  keys: string[],
  label: string,
  onRequest?: () => void,
): () => void {
  if (keys.length === 0) return () => {}

  return shortcuts.register({
    id: STARTER_KIT_COPILOT_SHORTCUT,
    keys,
    label,
    group: 'general',
    allowInInputs: true,
    handler: () => {
      requestStarterKitCopilot()
      onRequest?.()
    },
  })
}

/** Ask for the copilot to open as soon as it has loaded. */
export function requestStarterKitCopilot(): void {
  copilotRequested = true
}

/** Whether the copilot was asked for before it loaded (and forget the request). */
export function takeRequestedStarterKitCopilot(): boolean {
  const requested = copilotRequested

  copilotRequested = false

  return requested
}

/**
 * The copilot component in the loaded panel data: the panel's own pages show it in the
 * `topbar.end` slot, which starter kit hosts don't render. Null without the AI plugin's
 * copilot (or when the user may not use it).
 */
export function starterKitCopilot(panel: PanelSchema): AiCopilotSchema | null {
  for (const item of panel.slots?.['topbar.end'] ?? []) {
    if (item.type === 'component' && item.component.type === 'ai:copilot') {
      return item.component as unknown as AiCopilotSchema
    }
  }

  return null
}

// ---------------------------------------------------------------- Language switcher

let languagesRequested = false

/** Ask for the language menu to open as soon as it has loaded (a click on its trigger). */
export function requestStarterKitLanguages(): void {
  languagesRequested = true
}

/** Whether the language menu was asked for before it loaded (and forget the request). */
export function takeRequestedStarterKitLanguages(): boolean {
  const requested = languagesRequested

  languagesRequested = false

  return requested
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
