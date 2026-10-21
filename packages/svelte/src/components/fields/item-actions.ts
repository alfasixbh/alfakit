import type {
  ActionContext,
  ItemActionFallback,
  ItemActionName,
  ItemActionSchema,
} from '@alfakit/core'
import { itemActionContext, itemActionIcon } from '@alfakit/core'
import { useActionRunner, useT } from '../../context.svelte'

/** Default looks of the built-in item actions, for payloads without `itemActions` (icons follow their `alfakit::` aliases). */
export function useItemActionFallbacks(
  kind: 'repeater' | 'builder' = 'repeater',
): Record<ItemActionName, ItemActionFallback> {
  const t = useT()

  return {
    add: { label: '', icon: 'plus', variant: 'outline' },
    delete: {
      label: t('form.remove_item', {}, 'Remove'),
      icon: itemActionIcon(kind, 'delete', 'trash-2'),
      color: 'danger',
    },
    clone: { label: t('form.clone', {}, 'Clone'), icon: itemActionIcon(kind, 'clone', 'copy') },
    reorder: {
      label: t('form.reorder_item', {}, 'Reorder'),
      icon: itemActionIcon(kind, 'reorder', 'grip-vertical'),
    },
    moveUp: {
      label: t('form.move_up', {}, 'Move up'),
      icon: itemActionIcon(kind, 'move-up', 'chevron-up'),
    },
    moveDown: {
      label: t('form.move_down', {}, 'Move down'),
      icon: itemActionIcon(kind, 'move-down', 'chevron-down'),
    },
    collapse: {
      label: t('form.collapse_item', {}, 'Collapse'),
      icon: itemActionIcon(kind, 'collapse', 'chevron-up'),
    },
    expand: {
      label: t('form.expand_item', {}, 'Expand'),
      icon: itemActionIcon(kind, 'expand', 'chevron-down'),
    },
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

/** Run a built-in action: on the server when customised, else `onClient`. */
export function useRunItemAction(context: () => ActionContext) {
  const runner = useActionRunner()

  return (
    action: ItemActionSchema | null,
    args: Record<string, unknown>,
    onClient: () => void,
  ): void => {
    if (!action) return
    if (action.server) void runner.trigger(action, itemActionContext(context(), args))
    else onClient()
  }
}
