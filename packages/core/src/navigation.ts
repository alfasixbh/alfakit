import { htmlLabelToText } from './field-layout'
import type { NavigationItemSchema } from './schema/panel'

/** A navigation item with its nesting depth (0 for the group's own items). */
export interface FlatNavigationItem {
  item: NavigationItemSchema
  depth: number
}

/**
 * A group's items in display order with their children after them, for the flyout menu
 * of a group in the icon-only sidebar.
 */
export function flattenNavigationItems(
  items: NavigationItemSchema[],
  depth = 0,
): FlatNavigationItem[] {
  return items.flatMap((item) => [
    { item, depth },
    ...flattenNavigationItems(item.children ?? [], depth + 1),
  ])
}

/** Whether an item, or any of its children, is the current page. */
export function hasActiveNavigationItem(items: NavigationItemSchema[]): boolean {
  return items.some((item) => item.active || hasActiveNavigationItem(item.children ?? []))
}

/**
 * Plain text of a navigation item's label (an `Htmlable` label without its markup), for
 * tooltips, `aria-label`s and other places that can't show HTML.
 */
export function navigationItemText(
  item: Pick<NavigationItemSchema, 'label' | 'labelHtml'>,
): string {
  return item.labelHtml ? htmlLabelToText(item.label) : item.label
}

/** Plain text of a tenant's name (an `Htmlable` name without its markup). */
export function tenantNameText(tenant: { name: string; nameHtml?: boolean }): string {
  return tenant.nameHtml ? htmlLabelToText(tenant.name) : tenant.name
}
