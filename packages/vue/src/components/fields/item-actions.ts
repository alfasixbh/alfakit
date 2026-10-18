import type {
  ActionContext,
  ItemActionFallback,
  ItemActionName,
  ItemActionSchema,
} from '@alfakit/core'
import { ItemMoveTracker, itemActionContext } from '@alfakit/core'
import { nextTick, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useActionRunner, useT } from '../../context'

/** Default looks of the built-in item actions, for payloads without `itemActions`. */
export function useItemActionFallbacks(): Record<ItemActionName, ItemActionFallback> {
  const t = useT()

  return {
    add: { label: '', icon: 'plus', variant: 'outline' },
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

/** Run a built-in action: on the server when customised, else `onClient`. */
export function useRunItemAction(context: MaybeRefOrGetter<ActionContext>) {
  const runner = useActionRunner()

  return (
    action: ItemActionSchema | null,
    args: Record<string, unknown>,
    onClient: () => void,
  ): void => {
    if (!action) return
    if (action.server) void runner.trigger(action, itemActionContext(toValue(context), args))
    else onClient()
  }
}

/**
 * Moves made with the item move buttons: one at a time, announced in a live region
 * (`announcement`) and with focus kept on the moved item's move button. Put `container` on
 * an element holding the items (they carry `data-index`).
 */
export function useItemMoves(
  value: MaybeRefOrGetter<unknown>,
  move: (from: number, to: number) => void,
  labelFor: (index: number) => string | null | undefined,
  count: MaybeRefOrGetter<number>,
) {
  const t = useT()
  const tracker = new ItemMoveTracker()
  const announcement = ref('')
  const container = ref<HTMLElement | null>(null)

  watch(
    () => toValue(value),
    () => {
      if (tracker.isMoving) void nextTick(() => tracker.finish(container.value))
    },
  )

  const moveWithButton = (from: number, to: number) => {
    const total = toValue(count)

    if (to < 0 || to >= total || !tracker.begin(from, to)) return

    const label = labelFor(from)

    move(from, to)
    announcement.value = label
      ? t(
          'form.labelled_item_moved',
          { item: label, position: to + 1, total },
          ':item moved to position :position of :total',
        )
      : t(
          'form.item_moved',
          { position: to + 1, total },
          'Item moved to position :position of :total',
        )
  }

  return { moveWithButton, announcement, container }
}
