import type { ActionSchema } from './actions'
import type { Color, IconName, IconPosition } from './common'

/** A tab above a resource's list table (`ListRecords::getTabs()`). */
export interface ListTabSchema {
  key: string
  label: string
  icon?: IconName
  iconPosition?: IconPosition
  badge?: string | number
  badgeColor?: Color
  /** `Tab::deferBadge()`: the badge arrives in the `alfakitTabBadges` deferred prop. */
  badgeDeferred?: boolean
  /** `Tab::extraAttributes()`, rendered on the tab button (`class` is merged). */
  extraAttributes?: Record<string, unknown>
}

/** The `alfakitTabBadges` deferred prop: badges of `deferBadge()` tabs by tab key. */
export type DeferredTabBadges = Record<string, { badge?: string | number; badgeColor?: Color }>

/** The list tabs of a table block. */
export interface ListTabsProps {
  tabs?: ListTabSchema[]
  /** Key of the tab whose query the records come from. */
  activeTab?: string
  /** Query-string key the active tab is kept under (`activeTab`). */
  tabsQueryKey?: string
}

/** Several relation managers under one tab (`RelationGroup`). */
export interface RelationGroupSchema {
  key: string
  title: string
  icon?: IconName
  badge?: string | number
  badgeColor?: Color
  /** `RelationGroup::deferBadge()`: the badge arrives with the deferred lazy components. */
  badgeDeferred?: boolean
  /** Components (`relationManager:Class`) of the managers in the group, in order. */
  managers: string[]
  /** The group's key in `getRelations()`: its tab in the `?relation=` query string. */
  slug?: string
}

/** One result of the global search. */
export interface GlobalSearchResultSchema {
  title: string
  url: string
  details?: Record<string, unknown>
  /** URL actions shown next to the result (`getGlobalSearchResultActions()`). */
  actions?: ActionSchema[]
}

export interface GlobalSearchGroupSchema {
  label: string
  results: GlobalSearchResultSchema[]
}
