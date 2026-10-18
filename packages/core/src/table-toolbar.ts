import type { Color, IconName } from './schema/common'
import type {
  FilterIndicator,
  TableSchema,
  TableTriggerActionKey,
  TableTriggerActionSchema,
} from './schema/table'
import { createStore, type Store } from './store'

// ---------------------------------------------------------------- Trigger buttons

/** How a toolbar button renders, after `filtersTriggerAction()` & co. */
export interface TriggerButtonView {
  label: string
  /** Show the label (false: icon only, the label becomes the accessible name). */
  showLabel: boolean
  /** Server icon; absent means the renderer's default icon. */
  icon?: IconName
  iconAfter: boolean
  /** shadcn button variant. */
  variant: 'default' | 'outline' | 'ghost' | 'link'
  color?: Color
  size: 'xs' | 'sm' | 'default' | 'lg'
  badge?: string | number
  badgeColor?: Color
  tooltip?: string
  disabled: boolean
}

export interface TriggerButtonDefaults {
  label: string
  /** The default look shows the label (otherwise from `sm` up only). */
  showLabel?: boolean
  variant?: TriggerButtonView['variant']
  badge?: string | number
}

/**
 * The view of a toolbar button: the server's `triggerActions[key]` when the button was
 * customised, else the defaults. Null when the customisation hid the button.
 */
export function triggerButtonView(
  table: Pick<TableSchema, 'triggerActions'>,
  key: TableTriggerActionKey,
  defaults: TriggerButtonDefaults,
): TriggerButtonView | null {
  const trigger: TableTriggerActionSchema | undefined = table.triggerActions?.[key]

  if (trigger?.hidden) return null

  if (!trigger) {
    return {
      label: defaults.label,
      showLabel: defaults.showLabel ?? true,
      iconAfter: false,
      variant: defaults.variant ?? 'outline',
      size: 'sm',
      badge: defaults.badge,
      disabled: false,
    }
  }

  const variant = trigger.outlined ? 'outline' : trigger.variant
  const label = trigger.label ?? defaults.label

  return {
    label,
    showLabel: variant !== 'icon-button' && Boolean(trigger.label),
    icon: trigger.icon,
    iconAfter: trigger.iconPosition === 'after',
    variant:
      variant === 'link'
        ? 'link'
        : variant === 'ghost' || variant === 'icon-button'
          ? 'ghost'
          : variant === 'button'
            ? 'default'
            : 'outline',
    color: trigger.color && trigger.color !== 'gray' ? trigger.color : undefined,
    size: trigger.size === 'xs' || trigger.size === 'lg' ? trigger.size : 'sm',
    badge: trigger.badge ?? defaults.badge,
    badgeColor: trigger.badgeColor,
    tooltip: trigger.tooltip,
    disabled: Boolean(trigger.disabled),
  }
}

// ---------------------------------------------------------------- Loading skeleton

/** In-flight table visits by identifier (`''` for none), for `loadingSkeleton()`. */
export const tableLoadingStore: Store<Record<string, number>> = createStore<Record<string, number>>(
  {},
)

export function beginTableLoading(identifier: string | undefined): void {
  const key = identifier ?? ''

  tableLoadingStore.set((state) => ({ ...state, [key]: (state[key] ?? 0) + 1 }))
}

export function endTableLoading(identifier: string | undefined): void {
  const key = identifier ?? ''

  tableLoadingStore.set((state) => ({ ...state, [key]: Math.max(0, (state[key] ?? 0) - 1) }))
}

export function isTableLoading(
  state: Record<string, number>,
  identifier: string | undefined,
): boolean {
  return (state[identifier ?? ''] ?? 0) > 0
}

/** Rows of the loading skeleton: as many as shown (at least 3, at most 10). */
export function skeletonRowCount(records: unknown[] | undefined): number {
  return Math.min(10, Math.max(3, records?.length ?? 0))
}

// ---------------------------------------------------------------- Pagination

/** First / last page buttons of numbered pagination (`extremePaginationLinks()`). */
export function extremePageLinks(
  table: Pick<TableSchema, 'extremePaginationLinks'>,
  currentPage: number,
  lastPage: number,
): { first: number | null; last: number | null } | null {
  if (!table.extremePaginationLinks) return null

  return {
    first: currentPage > 1 ? 1 : null,
    last: currentPage < lastPage ? lastPage : null,
  }
}

// ---------------------------------------------------------------- Lists

/** The items shown by an expandable limited list, and how many are hidden. */
export function limitedListItems<T>(
  items: T[],
  schema: { expandableLimitedList?: boolean; listLimit?: number },
  expanded: boolean,
): { items: T[]; hidden: number } {
  const limit = schema.expandableLimitedList ? schema.listLimit : undefined

  if (limit === undefined || expanded || items.length <= limit) {
    return { items, hidden: 0 }
  }

  return { items: items.slice(0, limit), hidden: items.length - limit }
}

// ---------------------------------------------------------------- Images

/**
 * Inline style of a stacked image with `ring()` / `overlap()` (logical margin, so it works
 * right to left). Undefined keeps the default classes (`ring-2`, `-space-x-2`).
 */
export function stackedImageStyle(
  index: number,
  schema: { stacked?: boolean; ring?: number; overlap?: number },
): Record<string, string> | undefined {
  if (!schema.stacked || (schema.ring === undefined && schema.overlap === undefined)) {
    return undefined
  }

  const ring = schema.ring ?? 2
  const overlap = schema.overlap ?? 2

  return {
    boxShadow: ring > 0 ? `0 0 0 ${ring}px var(--background)` : 'none',
    marginInlineStart: index > 0 ? `${-overlap * 0.25}rem` : '0',
  }
}

/** Whether stacked images keep the default ring / overlap classes. */
export function usesDefaultImageStack(schema: { ring?: number; overlap?: number }): boolean {
  return schema.ring === undefined && schema.overlap === undefined
}

// ---------------------------------------------------------------- Filter indicators

/**
 * The filter state after removing an indicator: the whole filter, or only its
 * `removeField` (`Indicator::removeField()`).
 */
export function removeFilterIndicator(
  filterState: Record<string, Record<string, unknown>> | undefined,
  indicator: FilterIndicator,
): Record<string, Record<string, unknown>> {
  const next = { ...(filterState ?? {}) }

  if (indicator.removeField) {
    next[indicator.filter] = { ...(next[indicator.filter] ?? {}), [indicator.removeField]: null }
  } else {
    delete next[indicator.filter]
  }

  return next
}

/** The filter state after "remove all": only filters with unremovable indicators stay. */
export function removeAllFilterIndicators(
  filterState: Record<string, Record<string, unknown>> | undefined,
  indicators: FilterIndicator[] | undefined,
): Record<string, Record<string, unknown>> {
  const kept = new Set(
    (indicators ?? []).filter((item) => item.removable === false).map((item) => item.filter),
  )

  return Object.fromEntries(
    Object.entries(filterState ?? {}).filter(([filter]) => kept.has(filter)),
  )
}

// ---------------------------------------------------------------- Column manager

/** Toggle a column in a (draft) list of visible columns. */
export function toggleVisibleColumn(visible: string[], name: string): string[] {
  return visible.includes(name) ? visible.filter((column) => column !== name) : [...visible, name]
}

/** Whether a deferred column manager's draft differs from the applied columns. */
export function columnDraftChanged(applied: string[], draft: string[]): boolean {
  return applied.length !== draft.length || draft.some((name) => !applied.includes(name))
}

/** The columns shown before any toggling: the server's defaults (`isToggledHiddenByDefault`). */
export function defaultVisibleColumns(table: Pick<TableSchema, 'columns'>): string[] {
  return table.columns
    .filter((column) => !column.toggleable || !column.toggledHiddenByDefault)
    .map((column) => column.name)
}
