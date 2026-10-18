import type { BaseWidgetSchema } from './widgets'

/**
 * One row of an analytics top list (alfasix/alfakit-analytics). Every value is formatted
 * by the server in the panel's locale (`display`); the raw numbers are for sorting or
 * custom renderers.
 */
export interface AnalyticsBreakdownRowSchema {
  key: string
  /** The raw dimension value (`''` for none). */
  value: string
  label: string
  /** A decorative emoji flag (countries). */
  flag?: string | null
  visitors: number
  secondary?: number | null
  /** `[visitors, second metric]`, formatted. */
  display: [string, string] | string[]
  /** Bar width relative to the top row, 0–1. */
  bar: number
  /** Change of visitors from the previous period in percent (when comparing). */
  change?: number | null
  changeDisplay?: string | null
  /** The dashboard filtered by this row (or without the filter when `active`); empty: not filterable. */
  url: string
  /** The dashboard is filtered by this row. */
  active: boolean
}

export interface AnalyticsBreakdownTabSchema {
  /** The dimension (`page`, `source`, `prop:Signup:plan`…). */
  key: string
  label: string
  /** Column headers: the dimension, visitors, the second metric. */
  columns: [string, string, string] | string[]
  rows: AnalyticsBreakdownRowSchema[]
  /** The dashboard is filtered by this dimension. */
  filtered?: boolean
}

/**
 * `TopListWidget` of alfasix/alfakit-analytics, rendered by the `analytics:breakdown`
 * registry component: a card with a tab per dimension, each a list of bars that link to
 * the filtered dashboard.
 */
export interface AnalyticsBreakdownWidgetSchema extends BaseWidgetSchema {
  type: 'AnalyticsBreakdown'
  component: 'analytics:breakdown' | (string & {})
  heading: string
  /** `pages`, `sources`, `campaigns`, `locations`, `devices`, `events`, `goals`. */
  panel: string
  tabs: AnalyticsBreakdownTabSchema[]
  /** The tab open at first (else the first tab). */
  activeTab?: string | null
  /** The previous period is compared (rows carry `change`). */
  compare?: boolean
  emptyLabel?: string
}
