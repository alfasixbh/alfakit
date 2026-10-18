import type { ActionContext } from './actions'
import type { ActionVariant, Color } from './schema/common'
import type { ItemActionName, ItemActionSchema, ItemActionsSchema } from './schema/components'

/** What a renderer shows for a built-in item action the server didn't describe. */
export interface ItemActionFallback {
  label: string
  icon: string
  color?: Color
  variant?: ActionVariant
}

/**
 * The schema to render for the built-in action `name` of a Repeater, Builder or KeyValue:
 * the item's own (customised actions are evaluated per item), else the field's (the server
 * only sends customised actions), else a default built from `fallback`. Null means hidden;
 * whether the field allows the action at all comes from its switches (`deletable` …).
 */
export function resolveItemAction(
  name: ItemActionName,
  field: { itemActions?: ItemActionsSchema },
  item: { itemActions?: ItemActionsSchema } | undefined,
  fallback: ItemActionFallback,
): ItemActionSchema | null {
  if (item?.itemActions && name in item.itemActions) {
    return item.itemActions[name] ?? null
  }

  if (field.itemActions && name in field.itemActions) {
    return field.itemActions[name] ?? null
  }

  return {
    type: 'Action',
    name,
    label: fallback.label,
    icon: fallback.icon,
    color: fallback.color ?? 'gray',
    variant: fallback.variant ?? 'icon-button',
  }
}

/** Whether the item action must run through the server (it was customised). */
export function runsItemActionOnServer(action: ItemActionSchema | null | undefined): boolean {
  return Boolean(action?.server)
}

/** The action context of an item action: the field's context plus its arguments. */
export function itemActionContext(
  context: ActionContext,
  args: Record<string, unknown>,
): ActionContext {
  return { ...context, arguments: { ...context.arguments, ...args } }
}

/** A copy of an item action schema with render-time overrides (disabled, attributes). */
export function withItemActionState(
  action: ItemActionSchema,
  state: { disabled?: boolean; attributes?: Record<string, string> },
): ItemActionSchema {
  return {
    ...action,
    disabled: Boolean(action.disabled || state.disabled) || undefined,
    extraAttributes: state.attributes
      ? { ...action.extraAttributes, ...state.attributes }
      : action.extraAttributes,
  }
}

/** The item keys (positions) after moving the item at `from` to `to`. */
export function reorderedItemKeys(count: number, from: number, to: number): string[] {
  const keys = Array.from({ length: count }, (_, index) => String(index))

  if (from === to || from < 0 || to < 0 || from >= count || to >= count) return keys

  const [moved] = keys.splice(from, 1)
  keys.splice(to, 0, moved as string)

  return keys
}

/** Flex alignment of the add button (`addActionAlignment()`). */
export function addActionJustify(alignment: string | undefined): 'start' | 'center' | 'end' {
  return alignment === 'center'
    ? 'center'
    : alignment === 'end' || alignment === 'right'
      ? 'end'
      : 'start'
}

// ---------------------------------------------------------------- Reordering with buttons

export type ItemMoveDirection = 'up' | 'down'

/** The attribute that marks an item's move up / down buttons (`data-item-move="up"`). */
export const ITEM_MOVE_ATTRIBUTE = 'data-item-move'

/**
 * A move made with an item's move up / down buttons, for screen reader and keyboard users:
 * one move at a time (a press while the previous move is still rendering is ignored), then
 * focus goes back to the moved item's button (or its other one at the ends of the list).
 */
export class ItemMoveTracker {
  private pending: { index: number; direction: ItemMoveDirection } | null = null

  /** Start a move from `from` to `to`; false when another move hasn't finished. */
  begin(from: number, to: number): boolean {
    if (this.pending || from === to) return false

    this.pending = { index: to, direction: to < from ? 'up' : 'down' }

    return true
  }

  get isMoving(): boolean {
    return this.pending !== null
  }

  /**
   * After the list re-rendered: focus the moved item's move button inside `container`
   * (items carry `data-index`). Ends the move either way.
   */
  finish(container: ParentNode | null | undefined): boolean {
    const pending = this.pending

    this.pending = null

    if (!pending || !container) return false

    return focusMovedItem(container, pending.index, pending.direction)
  }

  /** Forget the pending move without focusing (the move was cancelled). */
  cancel(): void {
    this.pending = null
  }
}

/** Focus the move button of the item at `index` (its other one when that is disabled). */
export function focusMovedItem(
  container: ParentNode,
  index: number,
  direction: ItemMoveDirection,
): boolean {
  const item = container.querySelector(`[data-index="${index}"]`)

  if (!item) return false

  const button = (name: ItemMoveDirection) =>
    item.querySelector<HTMLElement>(`[${ITEM_MOVE_ATTRIBUTE}="${name}"]:not(:disabled)`)
  const target = button(direction) ?? button(direction === 'up' ? 'down' : 'up')

  target?.focus()

  return Boolean(target)
}
