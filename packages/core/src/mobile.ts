import type { NavigationGroupSchema, NavigationItemSchema, PanelSchema } from './schema/panel'
import type { ColumnLayoutNode, ColumnSchema, TableSchema } from './schema/table'

/**
 * Whether the panel uses the mobile preset (`Panel::mobile()`, design `mobile: 'bottom'`):
 * a bottom navigation bar, tables as stacked cards, slide-over modals, 44px touch targets
 * and sticky form actions below the `md` breakpoint.
 */
export function hasMobilePreset(
  panel: { theme?: { design?: { mobile?: string } } | null } | null | undefined,
): boolean {
  return panel?.theme?.design?.mobile === 'bottom'
}

/** How many items the bottom bar shows before the rest move into the "More" sheet. */
export const BOTTOM_NAVIGATION_SLOTS = 4

export interface BottomNavigationItems {
  /** Items drawn in the bar. */
  primary: NavigationItemSchema[]
  /** Items behind the "More" button; empty when everything fits. */
  overflow: NavigationItemSchema[]
}

/** The link an item opens: its own URL, or its first child's. */
export function navigationItemUrl(item: NavigationItemSchema): string | undefined {
  return item.url ?? item.children?.find((child) => child.url)?.url
}

/** Whether an item or one of its children is the current page. */
export function isNavigationItemActive(item: NavigationItemSchema): boolean {
  return Boolean(item.active || item.children?.some(isNavigationItemActive))
}

/**
 * The top-level items of the panel navigation for the bottom bar. Group labels are dropped
 * (the groups' items are top-level items); an item with children keeps its place and opens
 * its first child. When more than `slots` items exist, the last slot becomes "More" and
 * holds the overflow, so the bar never scrolls.
 */
export function bottomNavigationItems(
  navigation: Pick<NavigationGroupSchema, 'items'>[] | null | undefined,
  slots: number = BOTTOM_NAVIGATION_SLOTS,
): BottomNavigationItems {
  const items = (navigation ?? []).flatMap((group) => group.items)

  if (items.length <= slots) {
    return { primary: items, overflow: [] }
  }

  const visible = Math.max(slots - 1, 0)

  return { primary: items.slice(0, visible), overflow: items.slice(visible) }
}

/**
 * The card layout the mobile preset gives a table that defines none: every visible column
 * stacked, the primary column first (as the table already orders them).
 */
export function mobileCardLayout(columns: Pick<ColumnSchema, 'name'>[]): ColumnLayoutNode[] {
  return [
    {
      type: 'Stack',
      space: 1,
      schema: columns.map((column) => ({ type: 'Column', name: column.name })),
    },
  ]
}

/**
 * The table to render on a phone under the mobile preset: tables without a content layout
 * get a stacked card layout; tables with one keep it. Returns the table unchanged on
 * wider screens or without the preset, so server-rendered and desktop markup never change.
 */
export function mobileTable(
  table: TableSchema,
  columns: Pick<ColumnSchema, 'name'>[],
  options: { isMobile: boolean; panel: Pick<PanelSchema, 'theme'> | null | undefined },
): TableSchema {
  if (!options.isMobile || table.contentLayout || !hasMobilePreset(options.panel)) {
    return table
  }

  return { ...table, contentLayout: mobileCardLayout(columns) }
}
