import type { Color, IconName } from './schema/common'
import type { DeferredTabBadges, ListTabSchema } from './schema/resources'
import type {
  LazyRelationManagerSchema,
  RelationManagersBlock,
  RelationManagerSchema,
  RelationManagersContentTabSchema,
} from './schema/table'

/** Default query-string key of the active list tab (`HasTabs::ACTIVE_TAB_QUERY_KEY`). */
export const ACTIVE_TAB_QUERY_KEY = 'activeTab'

/**
 * The URL that shows a list tab: the current URL with the tab in the query string and the
 * page reset (filters, search and sort are kept).
 */
export function listTabUrl(
  href: string,
  key: string,
  queryKey: string = ACTIVE_TAB_QUERY_KEY,
  pageKey = 'page',
): string {
  const url = new URL(href, 'http://localhost')
  url.searchParams.set(queryKey, key)
  url.searchParams.delete(pageKey)

  const relative = `${url.pathname}${url.search}${url.hash}`

  return /^https?:\/\//.test(href) ? url.toString() : relative
}

/**
 * The list tabs with the badges of `deferBadge()` tabs filled in from the
 * `alfakitTabBadges` deferred prop, once it arrived. Until then those tabs have no badge
 * and `badgePending` is true (renderers show a placeholder).
 */
export function withDeferredTabBadges(
  tabs: ListTabSchema[],
  badges: DeferredTabBadges | null | undefined,
): Array<ListTabSchema & { badgePending?: boolean }> {
  return tabs.map((tab) => {
    if (!tab.badgeDeferred) return tab

    const loaded = badges?.[tab.key]

    if (!badges) return { ...tab, badgePending: true }

    return { ...tab, badge: loaded?.badge, badgeColor: loaded?.badgeColor ?? tab.badgeColor }
  })
}

type Manager = RelationManagerSchema | LazyRelationManagerSchema

/** One tab of the relation managers block: a single manager or a `RelationGroup`. */
export interface RelationManagerTab {
  key: string
  title: string
  icon?: IconName
  badge?: string | number
  badgeColor?: Color
  /** Tooltip of the badge (`RelationManager::$badgeTooltip`). */
  badgeTooltip?: string
  /** True for a `RelationGroup` (its managers render one after another). */
  group: boolean
  /** The tab's `?relation=` value: its key in `getRelations()`, else its position. */
  slug?: string
  managers: Manager[]
  /**
   * The page's form / infolist block on the content tab of a combined block
   * (`hasCombinedRelationManagerTabsWithContent()`); its `managers` are empty.
   */
  content?: RelationManagersContentTabSchema['block']
}

/** Key of the content tab of a combined relation managers block. */
export const RELATION_MANAGERS_CONTENT_TAB = 'alfakit-content'

/**
 * The tabs of a relation managers block, in declaration order: each ungrouped manager is a
 * tab, each group one tab holding its managers.
 */
export function relationManagerTabs(block: RelationManagersBlock): RelationManagerTab[] {
  const groupOf = new Map<string, NonNullable<RelationManagersBlock['groups']>[number]>()

  for (const group of block.groups ?? []) {
    for (const component of group.managers) {
      if (!groupOf.has(component)) groupOf.set(component, group)
    }
  }

  const tabs: RelationManagerTab[] = []
  const seen = new Set<string>()

  for (const manager of block.managers) {
    const group = groupOf.get(manager.component)

    if (!group) {
      tabs.push({
        key: manager.key,
        title: manager.title,
        icon: manager.icon ?? undefined,
        badge: manager.badge ?? undefined,
        badgeColor: manager.badgeColor ?? undefined,
        badgeTooltip: manager.badgeTooltip ?? undefined,
        slug: manager.slug,
        group: false,
        managers: [manager],
      })

      continue
    }

    if (seen.has(group.key)) continue

    seen.add(group.key)

    tabs.push({
      key: group.key,
      title: group.title,
      icon: group.icon,
      badge: group.badge,
      badgeColor: group.badgeColor,
      slug: group.slug,
      group: true,
      managers: group.managers
        .map((component) => block.managers.find((candidate) => candidate.component === component))
        .filter((candidate): candidate is Manager => Boolean(candidate)),
    })
  }

  if (block.content) {
    const content: RelationManagerTab = {
      key: RELATION_MANAGERS_CONTENT_TAB,
      title: block.content.label,
      icon: block.content.icon ?? undefined,
      badge: block.content.badge ?? undefined,
      badgeColor: block.content.badgeColor ?? undefined,
      group: false,
      managers: [],
      content: block.content.block,
    }

    if (block.content.position === 'after') tabs.push(content)
    else tabs.unshift(content)
  }

  // `getCombinedTabComponents()`: the content tab anywhere among the relation tabs.
  if (block.tabOrder?.length) {
    const byKey = new Map(tabs.map((tab) => [tab.key, tab]))

    return block.tabOrder
      .map((key) => byKey.get(key === 'content' ? RELATION_MANAGERS_CONTENT_TAB : key))
      .filter((tab): tab is RelationManagerTab => Boolean(tab))
  }

  return tabs
}

/**
 * Whether a relation managers block renders as tabs: several managers, a group, or a
 * combined form / infolist tab. A single manager is shown on its own.
 */
export function hasRelationManagerTabs(block: RelationManagersBlock): boolean {
  return block.managers.length > 1 || Boolean(block.groups?.length) || Boolean(block.content)
}

/** Query-string key the open relation manager tab is kept under (Filament's `?relation=`). */
export const RELATION_QUERY_KEY = 'relation'

/**
 * The `?relation=` value of a tab: its key in `getRelations()` when keyed, else its
 * position among the relation manager tabs (the content tab has none).
 */
export function relationTabSlug(tabs: RelationManagerTab[], key: string): string | null {
  const managers = tabs.filter((tab) => tab.key !== RELATION_MANAGERS_CONTENT_TAB)
  const index = managers.findIndex((tab) => tab.key === key)

  if (index === -1) return null

  return managers[index]!.slug ?? String(index)
}

/** The tab named by a `?relation=` value (a key in `getRelations()` or a position). */
export function relationTabFromQuery(
  tabs: RelationManagerTab[],
  value: string | null | undefined,
): RelationManagerTab | undefined {
  if (value === null || value === undefined || value === '') return undefined

  const managers = tabs.filter((tab) => tab.key !== RELATION_MANAGERS_CONTENT_TAB)

  return (
    managers.find((tab) => tab.slug === value) ??
    managers.find((tab, index) => !tab.slug && String(index) === value)
  )
}

/**
 * DOM ids linking a list tab to the table panel it controls (`aria-controls` /
 * `aria-labelledby`). `base` is a per-tabset id from the renderer.
 */
export function listTabIds(base: string, key: string): { tab: string; panel: string } {
  return { tab: `${base}-tab-${key.replace(/[^A-Za-z0-9_-]/g, '-')}`, panel: `${base}-panel` }
}

/**
 * The tab to focus after a key press in a tablist (roving focus): ArrowRight / ArrowLeft
 * move to the next / previous tab in reading order (swapped in RTL) and wrap around,
 * ArrowDown / ArrowUp do the same for vertical tabs, Home / End go to the first / last.
 * Returns null for other keys. Moving focus does not select a tab; Enter / Space does.
 */
export function tabKeyTarget(
  key: string,
  index: number,
  count: number,
  dir: 'ltr' | 'rtl' | string | null = 'ltr',
  orientation: 'horizontal' | 'vertical' = 'horizontal',
): number | null {
  if (count <= 0) return null

  const next = orientation === 'vertical' ? 'ArrowDown' : dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
  const previous =
    orientation === 'vertical' ? 'ArrowUp' : dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'

  switch (key) {
    case next:
      return (index + 1) % count
    case previous:
      return (index - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}
