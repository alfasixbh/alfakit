import type {
  NavigationBadgeSchema,
  NavigationGroupSchema,
  NavigationItemSchema,
  NavigationStateSchema,
  PanelSchema,
} from './schema/panel'

type Badges = Record<string, NavigationBadgeSchema>

/**
 * The last deferred badges seen in this tab, shown while the next page's badges load so
 * they do not blink on every visit. Browser only (a server render never keeps them).
 */
let lastDeferredBadges: Badges | null = null

const resolved = new WeakMap<object, { badges: Badges | null | undefined; panel: PanelSchema }>()

function resolveItems(
  items: NavigationItemSchema[],
  prefix: string,
  active: ReadonlySet<string>,
  badges: Badges | undefined,
  deferred: Badges | null,
): NavigationItemSchema[] {
  return items.map((item, index) => {
    const id = `${prefix}.${index}`
    const isActive = active.has(id)
    const { activeIcon, deferredBadge, ...rest } = item
    const badge = badges?.[id] ?? (deferredBadge ? deferred?.[id] : undefined)
    const next: NavigationItemSchema = { ...rest }

    if (isActive) {
      next.active = true
      if (activeIcon) next.icon = activeIcon
    }

    if (badge) {
      next.badge = badge.badge
      if (badge.badgeColor) next.badgeColor = badge.badgeColor
      if (badge.badgeTooltip) next.badgeTooltip = badge.badgeTooltip
    } else if (deferredBadge && deferred === null) {
      next.deferredBadge = true
      next.badgePending = true
    }

    if (item.children) {
      next.children = resolveItems(item.children, id, active, badges, deferred)
    }

    return next
  })
}

/**
 * The navigation with the request state merged in: `navigation` is the structure (an
 * Inertia once prop, the same on every page), `state` the active items and inline badges,
 * `deferred` the `alfakitNavigationBadges` deferred prop (`undefined` while it loads, then
 * items with a `deferredBadge` get `badgePending`).
 */
export function resolveNavigation(
  navigation: NavigationGroupSchema[],
  state: NavigationStateSchema | undefined,
  deferred?: Badges | null,
): NavigationGroupSchema[] {
  const active = new Set(state?.active ?? [])
  const known = deferred ?? (typeof window === 'undefined' ? null : lastDeferredBadges)

  return navigation.map((group, index) => ({
    ...group,
    items: resolveItems(group.items, String(index), active, state?.badges, known ?? null),
  }))
}

/**
 * The panel with `navigation` resolved (see `resolveNavigation()`); the same object for
 * the same inputs, so it can be used as a render dependency. Panels whose navigation
 * carries its own state (standalone and starter kit panels) are returned as they are.
 */
export function resolvePanelNavigation<T extends PanelSchema | null | undefined>(
  panel: T,
  deferredBadges?: Badges | null,
): T {
  if (!panel || typeof panel !== 'object') return panel

  if (deferredBadges && typeof window !== 'undefined') {
    lastDeferredBadges = deferredBadges
  }

  const needsDeferred = deferredBadges === undefined && hasDeferredBadges(panel.navigation)

  if (!panel.navigationState && !deferredBadges && !needsDeferred) {
    return panel
  }

  const cached = resolved.get(panel)

  if (cached && cached.badges === deferredBadges) return cached.panel as T

  const next = {
    ...panel,
    navigation: resolveNavigation(panel.navigation, panel.navigationState, deferredBadges),
  } as PanelSchema

  resolved.set(panel, { badges: deferredBadges, panel: next })

  return next as T
}

function some(
  items: NavigationItemSchema[] | undefined,
  test: (item: NavigationItemSchema) => boolean,
): boolean {
  return (items ?? []).some((item) => test(item) || some(item.children, test))
}

function hasDeferredBadges(navigation: NavigationGroupSchema[] | undefined): boolean {
  return (navigation ?? []).some((group) =>
    some(group.items, (item) => item.deferredBadge === true),
  )
}
