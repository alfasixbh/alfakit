import { debugRecorder } from './debug'
import {
  effectiveErrorNotifications,
  installErrorNotifications,
  resolveRequestErrorNotification,
  setRequestErrorReporter,
} from './error-notifications'
import { reloadOnExpiredPage } from './http'
import { navigationItemText } from './navigation'
import { installPrefetchInvalidation } from './prefetch'
import type { NotificationSchema } from './schema/notifications'
import type {
  AlfakitPageProps,
  BreadcrumbSchema,
  ErrorNotificationsSchema,
  MenuItemSchema,
  NavigationGroupSchema,
  NavigationItemSchema,
  PanelSchema,
  StarterKitNavigationSchema,
} from './schema/panel'
import { installSpaUrlExceptions } from './spa'

/**
 * Starter kit mode (`Panel::starterKit()`): Alfakit pages render inside an application made
 * from Laravel's React, Vue or Svelte starter kit, in the host's own layout. These helpers are
 * shared by the three renderers; the host's sidebar reads the navigation through each
 * renderer's `useAlfakitNavigation()`.
 */

/**
 * The sonner toaster Alfakit renders in starter kit mode. The host layout mounts its own
 * id-less `<Toaster />`; giving Alfakit's an id keeps each toast in one toaster even when the
 * host and Alfakit resolve the same sonner instance.
 */
export const STARTER_KIT_TOASTER_ID = 'alfakit'

/** Whether the panel runs inside a starter kit application (`Panel::starterKit()`). */
export function isStarterKitPanel(
  panel: Pick<PanelSchema, 'starterKit'> | null | undefined,
): boolean {
  return panel?.starterKit === true
}

/** A breadcrumb as the starter kits' `AppLayout` takes it (`BreadcrumbItem`). */
export interface StarterKitBreadcrumb {
  title: string
  href: string
}

/**
 * The page's breadcrumbs in the starter kits' shape: `{ title, href }` instead of
 * `{ label, url }`. The kits render the last crumb (the current page) as plain text and key
 * the list by `href`, so every `href` is unique: the last crumb without a URL keeps an empty
 * one, other crumbs without one (or repeating one) get a `#index` fragment.
 */
export function toStarterKitBreadcrumbs(
  breadcrumbs: BreadcrumbSchema[] | null | undefined,
): StarterKitBreadcrumb[] {
  const list = breadcrumbs ?? []
  const seen = new Set<string>()

  return list.map((crumb, index) => {
    let href = crumb.url ?? (index === list.length - 1 ? '' : `#${index}`)

    if (seen.has(href)) href = `${href}#${index}`

    seen.add(href)

    return { title: crumb.label, href }
  })
}

/** The breadcrumbs of an Alfakit page from its Inertia props (`props.page.breadcrumbs`). */
/**
 * Whether an Alfakit page renders inside the host layout (`createStarterKitPage({ layout })`).
 * Pages with the `auth` layout (sign-in, registration, password reset, multi-factor
 * challenge, email verification, `->login()` brought back after `starterKit()`) stand on
 * their own, like the host's auth pages: the host layout expects a signed-in user.
 */
export function usesStarterKitHostLayout(props: unknown): boolean {
  const page = (props as { page?: { layout?: string } } | null | undefined)?.page

  return page?.layout !== 'auth'
}

export function starterKitBreadcrumbsFromProps(props: unknown): StarterKitBreadcrumb[] {
  const page = (props as { page?: { breadcrumbs?: BreadcrumbSchema[] } } | null | undefined)?.page

  return toStarterKitBreadcrumbs(page?.breadcrumbs)
}

/**
 * The shared `alfakitNavigation` prop of a page: one entry per `starterKit()` panel, or none
 * for guests and pages of other panels.
 */
export function starterKitNavigations(props: unknown): StarterKitNavigationSchema[] {
  const value = (props as { alfakitNavigation?: unknown } | null | undefined)?.alfakitNavigation

  return Array.isArray(value) ? (value as StarterKitNavigationSchema[]) : []
}

/**
 * The panel of the open AlfaKit page (`props.alfakit.id`), or undefined on the host's own
 * pages. With several `starterKit()` panels, components without a `panel` follow it.
 */
export function currentStarterKitPanelId(props: unknown): string | undefined {
  const id = (props as { alfakit?: { id?: unknown } } | null | undefined)?.alfakit?.id

  return typeof id === 'string' ? id : undefined
}

/**
 * Order panel entries for components without a `panel` id: the open AlfaKit page's panel
 * first (an `/app` page of a second `starterKit()` panel shows that panel's navigation and
 * tenant menu), then the others in registration order.
 */
export function preferCurrentStarterKitPanel<T extends { id: string }>(
  entries: T[],
  props: unknown,
): T[] {
  const current = currentStarterKitPanelId(props)
  const index = current === undefined ? -1 : entries.findIndex((entry) => entry.id === current)

  return index <= 0 ? entries : [entries[index]!, ...entries.filter((_, i) => i !== index)]
}

/**
 * One panel's navigation, or null. Without an id: the open AlfaKit page's panel, else the
 * first starter kit panel.
 */
export function starterKitNavigation(
  props: unknown,
  panelId?: string,
): StarterKitNavigationSchema | null {
  const navigations = starterKitNavigations(props)

  return (
    (panelId === undefined
      ? preferCurrentStarterKitPanel(navigations, props)[0]
      : navigations.find((navigation) => navigation.id === panelId)) ?? null
  )
}

/**
 * A navigation item flattened for a starter kit sidebar: the label as text and the item's
 * nested children. `title`/`href` match the kits' `NavItem` so the host can reuse its types.
 */
export interface StarterKitNavItem {
  key: string
  title: string
  href: string
  icon?: string
  isActive: boolean
  openInNewTab: boolean
  badge?: string | number
  badgeColor?: string
  badgeTooltip?: string
  children: StarterKitNavItem[]
}

export interface StarterKitNavGroup {
  key: string
  label: string | null
  icon?: string
  items: StarterKitNavItem[]
}

function toNavItem(item: NavigationItemSchema, key: string): StarterKitNavItem {
  return {
    key,
    title: navigationItemText(item),
    href: item.url ?? '',
    icon: item.icon ?? undefined,
    isActive: item.active === true,
    openInNewTab: item.openInNewTab === true,
    badge: item.badge ?? undefined,
    badgeColor: item.badgeColor ?? undefined,
    badgeTooltip: item.badgeTooltip ?? undefined,
    children: toNavItems(item.children ?? [], key),
  }
}

/**
 * Items keyed by their URL (positional only without one, or for a repeated URL), so a keyed
 * list keeps each sidebar link with its own entry when the labels and their order change,
 * e.g. after a language switch; a reused Inertia `<Link>` kept navigating to the URL of the
 * entry it was created for (W-S4-08).
 */
function toNavItems(items: NavigationItemSchema[], parentKey: string): StarterKitNavItem[] {
  const seen = new Set<string>()

  return items.map((item, index) => {
    const url = item.url ? `url:${item.url}` : null
    const key = url && !seen.has(url) ? url : `${parentKey}.${index}`
    seen.add(key)

    return toNavItem(item, key)
  })
}

/** A panel's navigation groups as plain items for the host's sidebar primitives. */
export function toStarterKitNavGroups(
  groups: NavigationGroupSchema[] | null | undefined,
): StarterKitNavGroup[] {
  return (groups ?? []).map((group, index) => {
    const key = `${index}:${group.label ?? ''}`

    return {
      key,
      label: group.label ?? null,
      icon: group.icon ?? undefined,
      items: toNavItems(group.items, key),
    }
  })
}

/**
 * A user menu entry of a `starterKit()` panel for the kit's own dropdown items
 * (`<AlfakitUserMenuItems />`). `group` changes where a separator goes; `method: 'post'`
 * links are sent as POST (like the kit's Log out).
 */
export interface StarterKitUserMenuItem {
  key: string
  title: string
  href: string
  icon?: string
  openInNewTab: boolean
  method?: 'post'
  group: number
  /** Whether a separator goes before this entry (it starts a new group). */
  startsGroup: boolean
}

/** A panel's shared user menu links as plain items for the host's dropdown primitives. */
export function toStarterKitUserMenuItems(
  items: MenuItemSchema[] | null | undefined,
): StarterKitUserMenuItem[] {
  const links = (items ?? []).filter(
    (item): item is MenuItemSchema & { url: string } =>
      typeof item.url === 'string' && item.url !== '' && item.action === undefined,
  )

  return links.map((item, index) => {
    const group = item.group ?? 0

    return {
      key: `${index}:${item.label ?? ''}`,
      title: item.label ?? item.url,
      href: item.url,
      icon: item.icon ?? undefined,
      openInNewTab: item.openInNewTab === true,
      method: item.method,
      group,
      startsGroup: index > 0 && group !== (links[index - 1]!.group ?? 0),
    }
  })
}

/**
 * The props of a custom page component (`Page::$component`) rendered by `Alfakit/Page` (a
 * starter kit resolves only that page): its view data, with the page's live top-level props
 * of the same names, so a partial reload (`reloadProps('items')`) reaches the component.
 */
export function customPageProps(
  viewProps: Record<string, unknown> | null | undefined,
  pageProps: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(viewProps ?? {}) }

  for (const key of Object.keys(merged)) {
    if (pageProps && Object.prototype.hasOwnProperty.call(pageProps, key)) {
      merged[key] = pageProps[key]
    }
  }

  return merged
}

// ---------------------------------------------------------------- Browser runtime

/**
 * What the browser-wide listeners of starter kit mode read: the open Alfakit page's panel
 * and error notifications, or nothing while a page of the host application is open (its
 * errors keep Inertia's default handling).
 */
const runtime: {
  panel: PanelSchema | null
  errorNotifications: ErrorNotificationsSchema | false | undefined
  installed: boolean
} = { panel: null, errorNotifications: undefined, installed: false }

/**
 * Record the Alfakit page being rendered (called by each renderer's starter kit root while
 * it renders); `null` once the root unmounts, when a host page opens.
 */
export function syncStarterKitPage(props: Partial<AlfakitPageProps> | null): void {
  const panel = props?.alfakit ?? null

  runtime.panel = panel
  runtime.errorNotifications = panel ? effectiveErrorNotifications(panel, props?.page) : undefined

  if (typeof window !== 'undefined') {
    // Internal requests and form stores are recorded only while the page carries the debug prop.
    debugRecorder.setEnabled(props?.alfakitDebug !== undefined)
  }
}

/** The panel of the open Alfakit page in starter kit mode, or null on host pages. */
export function currentStarterKitPanel(): PanelSchema | null {
  return runtime.panel
}

/**
 * The listeners `createAlfakit()` installs, once per page load, for starter kit mode: reload
 * on an expired CSRF token (419), the panel's error notifications instead of Inertia's error
 * modal, a notification for failed internal requests, the panel's SPA URL exceptions, and
 * dropping prefetched pages after a save (and reloading pages Back restores after one).
 * Returns false when they were already installed (or on the server).
 */
export function installStarterKitRuntime(
  show: (notification: NotificationSchema) => void,
  t: (key: string, replacements?: Record<string, string | number>, fallback?: string) => string,
): boolean {
  if (typeof window === 'undefined' || runtime.installed) return false

  runtime.installed = true

  reloadOnExpiredPage()
  installPrefetchInvalidation()
  installSpaUrlExceptions(() => runtime.panel)
  installErrorNotifications(() => ({ errorNotifications: runtime.errorNotifications }), show)
  setRequestErrorReporter((error) => {
    const notification = resolveRequestErrorNotification(error, runtime.errorNotifications, t)

    if (notification) show(notification)
  })

  return true
}
