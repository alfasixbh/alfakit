import type {
  ActionContext,
  ActionSchema,
  ItemActionFallback,
  ItemActionName,
  ItemActionSchema,
  ItemActionsItemProps,
  ItemActionsProps,
} from '@alfakit/core'
import {
  ITEM_MOVE_ATTRIBUTE,
  ItemMoveTracker,
  addActionJustify,
  itemActionContext,
  resolveItemAction,
  withItemActionState,
} from '@alfakit/core'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  GripVerticalIcon,
  PlusIcon,
  Trash2Icon,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useActionRunner, useT } from '../../context'
import { extraProps } from '../../lib/attributes'
import { colorClass, ghostButtonColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { ActionButton } from '../actions/action-button'
import { ActionList } from '../actions/action-list'
import { Button } from '../ui/button'

/**
 * A built-in item action (Repeater, Builder, KeyValue). Uncustomised actions apply their
 * change in the browser (`onClient`); customised ones (`server`) run through the field
 * action endpoint with `args` (`item`, `items`, `block`).
 */
export function ItemActionButton({
  action,
  context,
  args,
  onClient,
  disabled,
  attributes,
  size = 'xs',
  className,
}: {
  action: ItemActionSchema | null
  context: ActionContext
  args?: Record<string, unknown>
  onClient?: () => void
  disabled?: boolean
  attributes?: Record<string, string>
  size?: 'xs' | 'sm' | 'default'
  className?: string
}) {
  if (!action) return null

  // Plain icon buttons that change the state in the browser repeat on every item: render
  // them light (no runner subscription, no tooltip portal, static icons).
  if (!action.server && action.variant === 'icon-button' && !action.badge) {
    const StaticIcon = action.icon ? STATIC_ICONS[action.icon] : undefined
    const label = action.label ?? action.tooltip ?? action.name

    return (
      <Button
        type="button"
        variant="plain"
        size={size === 'xs' ? 'icon-xs' : size === 'sm' ? 'icon-sm' : 'icon'}
        disabled={disabled || action.disabled}
        aria-label={label}
        title={action.tooltip ?? label}
        onClick={() => onClient?.()}
        {...extraProps(
          { ...action.extraAttributes, ...attributes },
          cn(colorClass(ghostButtonColorClasses, action.color, 'gray'), className),
        )}
      >
        {StaticIcon ? <StaticIcon /> : <Icon name={action.icon} />}
      </Button>
    )
  }

  return (
    <ServerItemActionButton
      action={action}
      context={context}
      args={args}
      onClient={onClient}
      disabled={disabled}
      attributes={attributes}
      size={size}
      className={className}
    />
  )
}

/** The common item action icons, bundled so headers don't wait for dynamic icons. */
const STATIC_ICONS: Record<string, LucideIcon> = {
  'chevron-up': ChevronUpIcon,
  'chevron-down': ChevronDownIcon,
  copy: CopyIcon,
  'trash-2': Trash2Icon,
  'grip-vertical': GripVerticalIcon,
  plus: PlusIcon,
}

function ServerItemActionButton({
  action,
  context,
  args,
  onClient,
  disabled,
  attributes,
  size = 'xs',
  className,
}: {
  action: ItemActionSchema
  context: ActionContext
  args?: Record<string, unknown>
  onClient?: () => void
  disabled?: boolean
  attributes?: Record<string, string>
  size?: 'xs' | 'sm' | 'default'
  className?: string
}) {
  const runner = useActionRunner()
  const scoped = useMemo(() => itemActionContext(context, args ?? {}), [context, args])

  return (
    <ActionButton
      action={withItemActionState(action, { disabled, attributes })}
      context={scoped}
      size={size}
      className={className}
      withKeyBindings={false}
      onTrigger={(schema, ctx) => (action.server ? runner.trigger(schema, ctx) : onClient?.())}
    />
  )
}

/** Run a built-in action: on the server when customised, else `onClient`. */
export function useRunItemAction(context: ActionContext) {
  const runner = useActionRunner()

  return (action: ItemActionSchema | null, args: Record<string, unknown>, onClient: () => void) => {
    if (!action) return
    if (action.server) void runner.trigger(action, itemActionContext(context, args))
    else onClient()
  }
}

/** Default looks of the built-in actions, for payloads without `itemActions`. */
export function useItemActionFallbacks(addLabel = ''): Record<ItemActionName, ItemActionFallback> {
  const t = useT()

  return {
    add: { label: addLabel, icon: 'plus', variant: 'outline' },
    delete: { label: t('form.remove_item', {}, 'Remove'), icon: 'trash-2', color: 'danger' },
    clone: { label: t('form.clone', {}, 'Clone'), icon: 'copy' },
    reorder: { label: t('form.reorder_item', {}, 'Reorder'), icon: 'grip-vertical' },
    moveUp: { label: t('form.move_up', {}, 'Move up'), icon: 'chevron-up' },
    moveDown: { label: t('form.move_down', {}, 'Move down'), icon: 'chevron-down' },
    collapse: { label: t('form.collapse_item', {}, 'Collapse'), icon: 'chevron-up' },
    expand: { label: t('form.expand_item', {}, 'Expand'), icon: 'chevron-down' },
    collapseAll: {
      label: t('form.collapse_all', {}, 'Collapse all'),
      icon: 'chevrons-down-up',
      variant: 'link',
    },
    expandAll: {
      label: t('form.expand_all', {}, 'Expand all'),
      icon: 'chevrons-up-down',
      variant: 'link',
    },
  }
}

/** Resolve every built-in action of a field (and optionally one of its items). */
export function useItemActions(
  field: ItemActionsProps,
  fallbacks: Record<ItemActionName, ItemActionFallback>,
) {
  return (name: ItemActionName, item?: ItemActionsItemProps): ItemActionSchema | null =>
    resolveItemAction(name, field, item, fallbacks[name])
}

export interface ItemHeaderActionsProps {
  context: ActionContext
  itemKey: string
  index: number
  count: number
  resolve: (name: ItemActionName) => ItemActionSchema | null
  extraActions?: ActionSchema[]
  buttons: boolean
  canClone: boolean
  canDelete: boolean
  collapsible: boolean
  collapsed: boolean
  onMove: (from: number, to: number) => void
  onClone: () => void
  onDelete: () => void
  onToggle: () => void
  children?: ReactNode
}

/** Marks the move buttons so focus can return to them after a move (`ItemMoveTracker`). */
const MOVE_UP_ATTRIBUTES = { [ITEM_MOVE_ATTRIBUTE]: 'up' }
const MOVE_DOWN_ATTRIBUTES = { [ITEM_MOVE_ATTRIBUTE]: 'down' }

/**
 * The end of an item header: move up / down, extra item actions, clone, delete and the
 * collapse toggle, in Filament's order.
 */
export function ItemHeaderActions({
  context,
  itemKey,
  index,
  count,
  resolve,
  extraActions,
  buttons,
  canClone,
  canDelete,
  collapsible,
  collapsed,
  onMove,
  onClone,
  onDelete,
  onToggle,
  children,
}: ItemHeaderActionsProps) {
  const args = useMemo(() => ({ item: itemKey }), [itemKey])
  const extraContext = useMemo(() => itemActionContext(context, args), [context, args])

  return (
    <div className="ms-auto flex items-center gap-0.5" data-slot="item-actions">
      {children}
      {buttons && (
        <>
          <ItemActionButton
            action={resolve('moveUp')}
            context={context}
            args={args}
            disabled={index === 0}
            attributes={MOVE_UP_ATTRIBUTES}
            onClient={() => onMove(index, index - 1)}
          />
          <ItemActionButton
            action={resolve('moveDown')}
            context={context}
            args={args}
            disabled={index === count - 1}
            attributes={MOVE_DOWN_ATTRIBUTES}
            onClient={() => onMove(index, index + 1)}
          />
        </>
      )}
      {extraActions && extraActions.length > 0 && (
        <ActionList actions={extraActions} context={extraContext} size="xs" className="gap-0.5" />
      )}
      {canClone && (
        <ItemActionButton
          action={resolve('clone')}
          context={context}
          args={args}
          onClient={onClone}
        />
      )}
      {canDelete && (
        <ItemActionButton
          action={resolve('delete')}
          context={context}
          args={args}
          className="text-destructive hover:text-destructive"
          onClient={onDelete}
        />
      )}
      {collapsible && (
        <ItemActionButton
          action={resolve(collapsed ? 'expand' : 'collapse')}
          context={context}
          args={args}
          attributes={{ 'aria-expanded': collapsed ? 'false' : 'true' }}
          onClient={onToggle}
        />
      )}
    </div>
  )
}

/** "Collapse all" / "Expand all" above collapsible items. */
export function CollapseAllActions({
  context,
  resolve,
  onCollapseAll,
  onExpandAll,
}: {
  context: ActionContext
  resolve: (name: ItemActionName) => ItemActionSchema | null
  onCollapseAll: () => void
  onExpandAll: () => void
}) {
  const collapseAll = resolve('collapseAll')
  const expandAll = resolve('expandAll')

  if (!collapseAll && !expandAll) return null

  return (
    <div className="flex justify-end gap-3" data-slot="item-collapse-actions">
      <ItemActionButton action={collapseAll} context={context} onClient={onCollapseAll} />
      <ItemActionButton action={expandAll} context={context} onClient={onExpandAll} />
    </div>
  )
}

const JUSTIFY = { start: 'justify-start', center: 'justify-center', end: 'justify-end' } as const

/** The row holding the add button, aligned with `addActionAlignment()`. */
export function AddActionRow({ alignment, children }: { alignment?: string; children: ReactNode }) {
  return (
    <div className={cn('flex', JUSTIFY[addActionJustify(alignment)])} data-slot="item-add-action">
      {children}
    </div>
  )
}

/**
 * Moves made with the item move buttons: one at a time, announced in a live region
 * ("Moved to position 2 of 5") and with focus kept on the moved item's move button.
 * Render `region` once in the field and put `containerRef` on an element holding the
 * items (they carry `data-index`).
 */
export function useItemMoves<T>(
  value: T,
  move: (from: number, to: number) => void,
  labelFor: (index: number) => string | null | undefined,
  count: number,
) {
  const t = useT()
  const [tracker] = useState(() => new ItemMoveTracker())
  const [announcement, setAnnouncement] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tracker.isMoving) tracker.finish(containerRef.current)
  }, [value, tracker])

  const moveWithButton = (from: number, to: number) => {
    if (to < 0 || to >= count || !tracker.begin(from, to)) return

    const label = labelFor(from)

    move(from, to)
    setAnnouncement(
      label
        ? t(
            'form.labelled_item_moved',
            { item: label, position: to + 1, total: count },
            ':item moved to position :position of :total',
          )
        : t(
            'form.item_moved',
            { position: to + 1, total: count },
            'Item moved to position :position of :total',
          ),
    )
  }

  const region = (
    <span aria-live="polite" aria-atomic="true" className="sr-only" data-slot="item-move-status">
      {announcement}
    </span>
  )

  return { moveWithButton, region, containerRef }
}
