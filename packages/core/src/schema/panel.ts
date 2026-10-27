import type { ActionSchema, AnyActionSchema } from './actions'
import type { CommandPaletteSchema, KeyboardShortcutsSchema } from './command-palette'
import type { Color, IconName, RecordKey, Width } from './common'
import type { SchemaComponent } from './components'
import type { DebugSchema } from './debug'
import type { DevToolsSchema } from './dev-tools'
import type { FormBlock, InfolistBlock, LinksBlock, SchemaBlock } from './form'
import type { NotificationSchema } from './notifications'
import type { PwaSchema } from './pwa'
import type { ConflictsSchema, PresenceSchema, RealtimeSchema } from './realtime'
import type { DeferredTabBadges } from './resources'
import type { StandaloneComponentSchema } from './standalone'
import type { RelationManagerSchema, RelationManagersBlock, TableBlock } from './table'
import type { WidgetSchema, WidgetsBlock } from './widgets'

export interface NavigationItemSchema {
  /** Text, or sanitised HTML when `labelHtml` is true (an `Htmlable` label). */
  label: string
  /** `label` is sanitised HTML: render it as markup (use `htmlLabelToText()` for text). */
  labelHtml?: boolean
  icon?: IconName
  /**
   * Split navigation (`alfakit.navigation` is an Inertia once prop): the icon of the item
   * while active, swapped in by `resolvePanelNavigation()`.
   */
  activeIcon?: IconName
  url?: string
  openInNewTab?: boolean
  active?: boolean
  badge?: string | number
  badgeColor?: Color
  badgeTooltip?: string
  /** `Panel::deferNavigationBadges()`: the item has a badge that loads after the page. */
  deferredBadge?: boolean
  /** Set by `resolvePanelNavigation()` while a deferred badge is loading (show a placeholder). */
  badgePending?: boolean
  /** `NavigationItem::extraAttributes()`: HTML attributes for the item's link (`class` merges). */
  extraAttributes?: Record<string, string | number | boolean | null>
  children?: NavigationItemSchema[]
}

export interface NavigationGroupSchema {
  label?: string | null
  icon?: IconName
  collapsible: boolean
  collapsed?: boolean
  items: NavigationItemSchema[]
  /** `NavigationGroup::extraSidebarAttributes()`: HTML attributes for the group in the sidebar. */
  extraSidebarAttributes?: Record<string, string | number | boolean | null>
  /** `NavigationGroup::extraTopbarAttributes()`: HTML attributes for the group in the top navigation. */
  extraTopbarAttributes?: Record<string, string | number | boolean | null>
}

/** A navigation item's badge, from `navigationState` or the deferred `alfakitNavigationBadges` prop. */
export interface NavigationBadgeSchema {
  badge: string | number
  badgeColor?: Color
  badgeTooltip?: string
}

/**
 * The per-request part of the panel navigation, whose structure (`navigation`) is an
 * Inertia once prop. Items are addressed by position: `group.item[.child…]` (`0.2.1`).
 */
export interface NavigationStateSchema {
  /** The active items (an active child's ancestors included). */
  active?: string[]
  /** Badges, unless `Panel::deferNavigationBadges()` defers them. */
  badges?: Record<string, NavigationBadgeSchema>
}

/** One `starterKit()` panel's navigation, as shared with the host application's pages. */
/** One `starterKit()` panel's dashboard widgets on a host page (`alfakitWidgets` prop). */
export interface StarterKitDashboardWidgetsSchema {
  /** The panel id. */
  id: string
  /** A standalone widgets payload bound to the panel (lazy loading and polling included). */
  component: StandaloneComponentSchema
}

/** `<html lang dir>` of a page in a starter kit app (`alfakitDocument`). */
export interface StarterKitDocumentSchema {
  /** BCP 47 tag of the page's language (`ar`, `en-GB`). */
  tag: string
  /** The direction of the language picked for the `starterKit()` panel. */
  direction: 'ltr' | 'rtl'
}

export interface StarterKitNavigationSchema {
  /** The panel id. */
  id: string
  /** The panel's home URL. */
  url: string
  brandName: string
  /** Empty for tenancy panels outside a tenant (their items link to tenant routes). */
  groups: NavigationGroupSchema[]
  /**
   * The panel's own user menu links (`userMenuItems()`, plugin entries such as Billing's),
   * for `<AlfakitUserMenuItems />` in the kit's user menu. Links only (entries with server
   * logic or a modal need an AlfaKit page); omitted when there are none, and for tenancy
   * panels outside a tenant.
   */
  userMenu?: MenuItemSchema[]
  /** What the drop-in header components render before they load. */
  widgets?: StarterKitWidgetsSchema
}

/**
 * The `widgets` of a `starterKit()` panel's shared navigation: what `<AlfakitSearch />`,
 * `<AlfakitNotifications />`, `<AlfakitTenantSwitcher />` and `<AlfakitLanguageSwitcher />`
 * show on any host page before their code and the panel data (`endpoint`) have loaded.
 */
export interface StarterKitWidgetsSchema {
  /** GET: the panel data the components render with (the `alfakit` prop of the panel's pages). */
  endpoint: string
  /** Global search or the command palette (tenancy panels: only inside a tenant). */
  search?: { keyBindings: string[]; placeholder: string }
  /** `databaseNotifications()`: the bell's label and the user's unread count. */
  notifications?: { label: string; unreadCount: number }
  /** Tenancy panels: the user's tenants; `current` is null on the host's own pages. */
  tenancy?: {
    current?: TenantSchema | null
    tenants: TenantSchema[]
    registrationUrl?: string
    /** The registration page's own label (`RegisterTenant::getLabel()`). */
    registrationLabel?: string
    searchable?: true
  }
  /**
   * `<AlfakitLanguageSwitcher />`: the button's label ("Change language") and the current
   * language, when the panel has a language switcher with two or more languages
   * (`locales()`). The languages and the locale endpoint come with the panel data.
   */
  language?: { label: string; current: LocaleSchema }
  /** While impersonating: the banner the header components show on the host's own pages. */
  impersonation?: ImpersonationSchema
  /**
   * `AiPlugin::copilot()` (alfasix/alfakit-ai, `$panel->starterKitWidget('copilot')`): the
   * label and shortcuts of `<AlfakitCopilot />` before its code loads. Tenancy panels: only
   * inside a tenant.
   */
  copilot?: { label: string; keyBindings: string[] }
}

/** A page's secondary navigation: cluster pages or a record's pages. */
export interface SubNavigationSchema {
  position: 'start' | 'end' | 'top'
  groups: NavigationGroupSchema[]
}

/**
 * An entry of the user or tenant menu: a link (`url`, `method: 'post'` for POST links) or
 * an `Action` with server logic or a modal (`action`), run through the action endpoint
 * with the component `userMenu` / `tenantMenu` and the page's token.
 */
export interface MenuItemSchema {
  label?: string
  icon?: IconName
  url?: string
  openInNewTab?: boolean
  color?: Color
  method?: 'post'
  action?: ActionSchema
  /** Group index (nested arrays in `userMenuItems()`); a separator divides groups. */
  group?: number
}

/** Action endpoint components of the menus (`Panel::USER_MENU_COMPONENT`, …). */
export const USER_MENU_COMPONENT = 'userMenu'
export const TENANT_MENU_COMPONENT = 'tenantMenu'

export interface PanelUserSchema {
  id: RecordKey
  name: string
  email?: string | null
  avatar?: string | null
}

export interface TenantSchema {
  id: RecordKey
  /** Text, or sanitised HTML when `nameHtml` is true (an `Htmlable` `getAlfakitName()`). */
  name: string
  /** `name` is sanitised HTML: render it as markup (use `htmlLabelToText()` for text). */
  nameHtml?: boolean
  avatar?: string | null
  url: string
  /** `HasCurrentTenantLabel`: a caption shown with the current tenant ("Active team"). */
  label?: string | null
}

/** The panel's design, see `Panel::theme()`. */
export interface PanelThemeSchema {
  name: string
  /** Value of `data-alfakit-theme`, base theme first: `"alfakit acme"`. */
  attribute: string
  sidebar: 'inset' | 'floating' | 'flush'
  density: 'comfortable' | 'compact'
  radius?: string | null
  font?: string | null
  /** CSS value for `--alfakit-font`. */
  fontCss?: string | null
  /** CSS value for `--alfakit-heading-font`. */
  headingFontCss?: string | null
  /** Stylesheet that loads the font, if any. */
  fontUrl?: string | null
  /** Every font stylesheet to load (body and heading fonts). */
  fontUrls?: string[]
  /** Structure and component styles; mirrored as `data-*` attributes on `<html>`. */
  design: PanelDesignSchema
  /**
   * Icon aliases replaced with `Icons::register()` (`alfakit::panels.sidebar.collapse-button`
   * → a Lucide name, image URL or sanitised SVG). The chrome falls back to its own icon.
   */
  icons?: Record<string, string> | null
}

export interface PanelDesignSchema {
  layout: 'sidebar' | 'topbar' | 'rail'
  nav: 'soft' | 'pill' | 'bar' | 'underline'
  header: 'plain' | 'banner' | 'band' | 'compact'
  surfaces: 'bordered' | 'elevated' | 'flat' | 'ring'
  inputs: 'outline' | 'filled' | 'underline'
  buttons: 'rounded' | 'pill' | 'square'
  tables: 'lined' | 'striped' | 'minimal'
  /**
   * Below the `md` breakpoint: `drawer` (default) or the `bottom` mobile preset (bottom
   * navigation bar, tables as stacked cards, slide-over modals, 44px touch targets and
   * sticky form actions). See `Panel::mobile()`.
   */
  mobile?: 'drawer' | 'bottom'
}

/**
 * One piece of slot content: server-rendered HTML or a schema component. `for` lists the
 * components (`relationManager:<class>`, `widget:<id>`) it is scoped to: such items only
 * render in a `<Slot scope="…">` of a matching component. `when` (`Panel::slot(…, when:)`)
 * limits it to renders whose slot data matches: `{ column: 'title' }` only renders in the
 * `table.header-cell` slot of the `title` column; a list value matches any of its entries.
 */
export type SlotItemSchema = (
  { type: 'html'; html: string } | { type: 'component'; component: SchemaComponent }
) & { for?: string[]; when?: Record<string, SlotDataValue | SlotDataValue[]> }

/** A value in a slot's render data (`<Slot data={{ column: 'title' }}>`). */
export type SlotDataValue = string | number | boolean | null

/** A language the panel can be displayed in. */
export interface LocaleSchema {
  /** Laravel-style code: `en`, `pt_BR`, `zh_Hant`. */
  code: string
  /** BCP 47 tag for `Intl` and the `lang` attribute: `pt-BR`. */
  tag: string
  /** The language's own name: `Deutsch`, `العربية`. */
  label: string
  direction: 'ltr' | 'rtl'
}

/** The current request's language, formats and the panel's language list. */
export interface LocalizationSchema extends LocaleSchema {
  fallbackLocale: string
  /** 0 = Sunday … 6 = Saturday. */
  firstDayOfWeek: number
  /** Default ISO 4217 currency. */
  currency: string
  /** IANA timezone dates are displayed in. */
  timezone: string
  /** Whether to show a language menu. */
  switcher: boolean
  /**
   * Where panel pages offer the menu (`Panel::languageSwitcher()`): the user menu (default
   * when absent), a top bar button, both, or neither. Auth pages keep their switcher.
   */
  switcherPosition?: LanguageSwitcherPosition
  /** Languages to offer in the menu (empty when the switcher is off). */
  locales: LocaleSchema[]
}

export type LanguageSwitcherPosition = 'user-menu' | 'topbar' | 'both' | 'hidden'

export interface PanelEndpoints {
  action: string
  modal: string
  schemaRefresh: string
  schemaOptions: string
  /** Validates one wizard step's fields (`step` = the Step component's key). */
  schemaValidate?: string
  /** Loads `deferLoading()` children and `Tab::deferBadge()` badges (`{schema}::{key}`). */
  schemaDeferred?: string
  tableCell: string
  tableReorder: string
  /** Stores a user's column order (`reorderableColumns()`). */
  tableColumns?: string
  /** `Table::deferTotals()`: the record count and summaries, loaded after the rows. */
  tableTotals?: string
  /** `Table::savedViews()`: save, share, rename, delete and pick a default view. */
  tableViews?: string
  /** `Table::spreadsheet()`: batch save (or validate) grid edits. */
  tableCells?: string
  /** Fresh schemas of lazy and polled components by token (components outside panels). */
  components?: string
  locale: string
  /** Calls `#[Expose]` methods of custom pages (`usePageMethod()`). */
  pageCall?: string
  /** Edit pages: what changed since the form was loaded (`detectConflicts()`). */
  conflicts?: string
  upload: string
  uploadDestroy: string
  /** Starts a resumable chunked upload (`{uploadChunks}/{id}` takes chunks, `/complete` finishes). */
  uploadChunks?: string
  globalSearch: string
  /** Command palette: "create" links and recent records (GET). */
  commandPalette?: string
  /** Stores the user's customised keyboard shortcuts (POST `{shortcuts}`). */
  shortcuts?: string
  /** `Action::undoable()`: undoes an action from its toast (POST `{undo}`). */
  undo?: string
  /** `Dashboard::customizable()`: saves or resets the user's layout (POST `{token, layout}`). */
  dashboardLayout?: string
  notifications: string
  notificationsReadAll: string
  notificationsDestroyAll: string
  logout: string
}

/** Where toasts appear (`Panel::toastPosition()`); `start`/`end` follow the reading direction. */
export type ToastPosition =
  'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end'

/** Shown while impersonating another user (`ImpersonateAction`). */
export interface ImpersonationSchema {
  /** "You are signed in as …", translated on the server. */
  label: string
  leaveLabel: string
  /** POST here to return to the real user. */
  leaveUrl: string
}

/** The `alfakit` prop shared with every page of a panel. */
/**
 * One `errorNotifications` entry: the text to show, or `hidden` (caught, nothing shown,
 * `hiddenErrorNotification()`) or `disabled` (default handling, `disabledErrorNotification()`).
 */
export interface ErrorNotificationEntrySchema {
  title?: string
  body?: string | null
  icon?: IconName
  hidden?: boolean
  disabled?: boolean
}

/** `errorNotifications`, keyed by HTTP status plus `default`. */
export type ErrorNotificationsSchema = Record<string, ErrorNotificationEntrySchema>

export interface PanelSchema {
  id: string
  /**
   * The schema contract version the server serialised (`SchemaContract::VERSION`). Renderers
   * compare its major part with `SCHEMA_CONTRACT_VERSION`; absent on servers before 1.0.
   */
  schemaContract?: string
  path: string
  url?: string
  /** Where "G then D" goes when it isn't `url`: the app's `/dashboard` for a starter kit panel without a dashboard page. */
  dashboardUrl?: string
  brandName: string
  brandLogo?: string
  darkModeBrandLogo?: string
  brandLogoHeight?: string
  favicon?: string
  /**
   * Colour custom properties without the `--alfakit-` prefix: `primary`, its readable
   * `primary-foreground` and, for palettes (`Color::Indigo`), `primary-50` … `primary-950`.
   */
  colors?: Record<string, string>
  /**
   * CSS for custom colour names (`colors(['brand' => …])`): `.alfakit-color-{name}` rules
   * that point the generic colour utilities of themes.css at `--alfakit-{name}`.
   */
  colorCss?: string
  darkMode: {
    enabled: boolean
    forced: boolean
    /** `defaultThemeMode()`; absent for `system`. */
    default?: 'light' | 'dark'
    /** `false` when `themeSwitcher(false)`: no switcher, always the default mode. */
    switcher?: false
  }
  /** `false` when `topbar(false)`: sidebar layouts render no top bar (a slim bar on phones). */
  topbar?: false
  sidebarCollapsibleOnDesktop: boolean
  sidebarFullyCollapsibleOnDesktop?: boolean
  topNavigation?: boolean
  maxContentWidth?: Width | string
  breadcrumbs: boolean
  unsavedChangesAlerts?: boolean
  /** `false` when `collapsibleNavigationGroups(false)`: groups never collapse. */
  collapsibleNavigationGroups?: false
  /** CSS lengths for the open and icon-only sidebar (`--sidebar-width`, `--sidebar-width-icon`). */
  sidebarWidth?: string
  collapsedSidebarWidth?: string
  /** Max width of `auth` layout pages (login, registration…). */
  simplePageMaxContentWidth?: Width | string
  /** `false` when `spa(false)`: every link loads a full page. */
  spa?: false
  /** URL patterns (`*` wildcard) that load with a full page request. */
  spaUrlExceptions?: string[]
  /**
   * Notifications shown instead of Inertia's error modal, keyed by HTTP status plus
   * `default`. Absent when disabled or in debug mode. A page's own `errorNotifications`
   * replaces it while that page is open.
   */
  errorNotifications?: ErrorNotificationsSchema
  theme: PanelThemeSchema
  /** Content inserted with `Panel::slot()`, keyed by slot name. */
  slots?: Record<string, SlotItemSchema[]>
  /**
   * Empty for `starterKit()` panels: their navigation is the `alfakitNavigation` page prop,
   * which every page of the host application carries (not only the panel's).
   */
  navigation: NavigationGroupSchema[]
  /**
   * The active items and badges of this request; `navigation` holds only the structure
   * (sent once). Read the navigation through `usePanel()`, which merges the two.
   */
  navigationState?: NavigationStateSchema
  /**
   * `Panel::starterKit()`: the panel runs inside a Laravel starter kit app. Its pages render
   * in the host's own layout (sidebar, header, appearance) and the host's shadcn tokens;
   * the panel's own chrome, theme attributes and colour scheme are not applied.
   */
  starterKit?: true
  user?: PanelUserSchema
  userMenu?: {
    items: MenuItemSchema[]
    profileUrl?: string
    logoutUrl: string
    /** The `profile` entry as customised in `userMenuItems()` (replaces the built-in link). */
    profile?: MenuItemSchema
    /** The customised `logout` entry, or `false` when it is hidden. */
    logout?: MenuItemSchema | false
    /**
     * `topbar` when `userMenu(position: UserMenuPosition::Topbar)`: sidebar layouts show the
     * menu in the top bar instead of the sidebar footer. Omitted for the sidebar.
     */
    position?: 'topbar'
  }
  tenancy?: {
    current?: TenantSchema | null
    tenants: TenantSchema[]
    registrationUrl?: string
    profileUrl?: string
    /** The registration page's own label (`RegisterTenant::getLabel()`); else "New". */
    registrationLabel?: string
    /** The profile page's own label (`EditTenantProfile::getLabel()`); else "Settings". */
    profileLabel?: string
    /** The customised `register` entry of `tenantMenuItems()`. */
    registration?: MenuItemSchema
    /** The customised `profile` entry of `tenantMenuItems()`. */
    profile?: MenuItemSchema
    menu?: MenuItemSchema[]
    /** `false` when `tenantSwitcher(false)`: `tenants` is empty and the menu lists no others. */
    switcher?: false
    /** `searchableTenantMenu()`, or more than 10 tenants: show a search field in the menu. */
    searchable?: boolean
  }
  databaseNotifications?: {
    pollingInterval?: string
    unreadCount: number
    /**
     * `sidebar` when `databaseNotifications(position: 'sidebar')` or `topbar(false)`: sidebar
     * layouts show the bell in the sidebar instead of the top bar. Omitted for the top bar.
     */
    position?: 'sidebar'
  }
  globalSearch?: {
    keyBindings: string[]
    placeholder: string
    /** `globalSearchDebounce()` in milliseconds; renderers default to 250. */
    debounce?: number
    /** `globalSearchFieldSuffix()`: text shown at the end of the field instead of the key hint. */
    suffix?: string
    /** `false` when `globalSearchFieldKeyBindingSuffix(false)`: no key binding hint. */
    keyBindingSuffix?: false
    /**
     * `sidebar` when `globalSearch(position: GlobalSearchPosition::Sidebar)` or
     * `topbar(false)`: sidebar layouts show the field in the sidebar header. Omitted for the top bar.
     */
    position?: 'sidebar'
  }
  endpoints: Partial<PanelEndpoints> & { logout: string }
  /** `alfakit.uploads.chunk_size` in bytes: larger files are uploaded in chunks. */
  uploadChunkSize?: number
  auth: { login?: string; register?: string; passwordReset?: string }
  flashKey: string
  /** Present while impersonating: render a banner with a way back. */
  impersonation?: ImpersonationSchema
  /**
   * `Panel::realtimeNotifications()`: the private channel to listen on with Laravel Echo;
   * with `Panel::realtime()` also the connection (`live`, `authEndpoint`, `echo`).
   */
  realtime?: RealtimeSchema
  /** Omitted for the default (`top-end`). */
  toastPosition?: ToastPosition
  /** The command palette's extras: page actions, panel commands, navigation, create links, recent records. */
  commandPalette?: CommandPaletteSchema
  /** Keyboard shortcuts (`false` with `keyboardShortcuts(false)`); absent for guests. */
  keyboardShortcuts?: KeyboardShortcutsSchema | false
  /** `Panel::pwa()`: service worker, install prompt and Web Push; absent when off. */
  pwa?: PwaSchema
  localization: LocalizationSchema
  csrf: string
  translations: Record<string, unknown>
}

export interface BreadcrumbSchema {
  label: string
  url?: string
}

export type ContentBlock =
  | FormBlock
  | InfolistBlock
  | SchemaBlock
  | TableBlock
  | RelationManagersBlock
  | WidgetsBlock
  | LinksBlock
  | { type: string; key: string; [key: string]: unknown }

export type PageLayout = 'app' | 'auth' | 'blank' | 'fullscreen'

/** The `page` prop rendered by `Alfakit/Page`. */
export interface PageSchema {
  class: string
  layout: PageLayout
  title: string
  heading?: string
  subheading?: string
  breadcrumbs?: BreadcrumbSchema[]
  maxContentWidth?: Width | string
  /** `fullscreen` layout: whether to show the slim header, and where its exit link goes. */
  fullscreen?: { header: boolean; exitUrl?: string }
  /** Cluster or record sub-navigation. */
  subNavigation?: SubNavigationSchema
  headerActions?: AnyActionSchema[]
  /** `$headerActionsAlignment`; absent for `end` (the default). */
  headerActionsAlignment?: 'start' | 'center' | 'end' | 'between' | 'justify'
  /** `$extraBodyAttributes` / `getExtraBodyAttributes()`: set on `<body>` while the page is open. */
  extraBodyAttributes?: Record<string, string>
  content: ContentBlock[]
  /** Encrypted context token for internal endpoints. */
  token: string
  record?: RecordKey
  view?: { component: string; props: Record<string, unknown> }
  /**
   * An action whose modal the renderer opens once the page hydrated (`$defaultAction`,
   * `?defaultAction=`, `?tableAction=&tableActionRecord=`).
   */
  defaultAction?: DefaultActionSchema
  /**
   * Page override of the panel's `errorNotifications` (`$hasErrorNotifications`,
   * `setUpErrorNotifications()`): `false` turns them off on this page. Absent when the
   * page follows the panel.
   */
  errorNotifications?: ErrorNotificationsSchema | false
  /** Record pages with `Panel::realtime()`: who else is on the record. */
  presence?: PresenceSchema
  /** Edit pages with `detectConflicts()`: the version the form was loaded from. */
  conflicts?: ConflictsSchema
}

/** `PageSchema::defaultAction`: what to open and in which context. */
export interface DefaultActionSchema {
  action: ActionSchema
  /** Context component: `page`, `table`, `relationManager:…`. */
  component: string
  record?: RecordKey
  arguments?: Record<string, unknown>
}

/**
 * Fresh schemas returned by a poll, keyed by poll target: `table`, `relationManager:Class`
 * or `widget:<id or class>`.
 */
export type PolledComponents = Record<string, ContentBlock | WidgetSchema | RelationManagerSchema>

/** Shape of `usePage().props` on an Alfakit page. */
export interface AlfakitPageProps {
  alfakit: PanelSchema
  page?: PageSchema
  /** Components refreshed by a poll (only present after one); merged into `page`. */
  alfakitPoll?: PolledComponents
  /**
   * Lazy widgets and relation managers (`Page::LAZY_PROP`), an Inertia deferred prop that
   * arrives right after the first response; `resolveLazyComponents()` puts them in `page`.
   */
  alfakitLazy?: PolledComponents
  /** Badges of `Tab::deferBadge()` list tabs, a deferred prop loaded after the page. */
  alfakitTabBadges?: DeferredTabBadges
  /**
   * `Panel::deferNavigationBadges()`: the navigation badges keyed by item id
   * (`navigationState`), a deferred prop loaded after the page.
   */
  alfakitNavigationBadges?: Record<string, NavigationBadgeSchema>
  alfakitAppearance?: 'light' | 'dark' | 'system'
  /** The stored sidebar state (`alfakit_sidebar_state` cookie); null when never toggled. */
  alfakitSidebarOpen?: boolean | null
  /**
   * The navigation of the application's `starterKit()` panels, shared with every Inertia
   * page (the host's own pages too) for the host sidebar. Null for guests.
   */
  alfakitNavigation?: StarterKitNavigationSchema[] | null
  /**
   * `<html lang dir>` while the app has a `starterKit()` panel, shared with every Inertia page
   * (the host's own pages and guests too): the app's current language and the direction of
   * the language picked for the panel, so the whole page flips in a right-to-left language.
   * Null on pages of other panels, which set the document themselves.
   */
  alfakitDocument?: StarterKitDocumentSchema | null
  /**
   * `starterKit()` panels: their dashboard widgets on the host's dashboard
   * (`starterKitDashboard()`), for `<AlfakitWidgets />`. Null on other pages, for guests
   * and users who may not open the panel.
   */
  alfakitWidgets?: StarterKitDashboardWidgetsSchema[] | null
  /**
   * The developer debug panel's data (`Page::DEBUG_PROP`): schema tree with visibility and
   * authorisation, evaluated closures and server timings. Only present while the panel's
   * debug panel is active; never in production.
   */
  alfakitDebug?: DebugSchema
  /**
   * The schema inspector's data (context identity, class links). Only present while the
   * panel's dev tools are on (`Panel::devTools()` with `app.debug`); never in production.
   */
  alfakitDevTools?: DevToolsSchema
  flash?: {
    alfakitNotifications?: NotificationSchema[]
    alfakitAction?: {
      name: string
      status: 'success' | 'halted' | 'cancelled'
      closeModal?: boolean
      deselectRecords?: boolean | null
      /** A file the handler returned: a signed, one-time link to save it from. */
      download?: string
    }
    [key: string]: unknown
  }
  errors?: Record<string, string>
  [key: string]: unknown
}

export type { ActionSchema }
