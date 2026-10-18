import { ItemMoveTracker } from '@alfakit/core'
import { tick } from 'svelte'
import { useT } from '../../context.svelte'

/**
 * Moves made with the item move buttons: one at a time, announced in a live region
 * (`announcement`) and with focus kept on the moved item's move button. Bind `container`
 * to an element holding the items (they carry `data-index`). Call during component setup.
 */
export function useItemMoves(
  move: (from: number, to: number) => void,
  labelFor: (index: number) => string | null | undefined,
  count: () => number,
) {
  const t = useT()
  const tracker = new ItemMoveTracker()
  const state = $state<{ announcement: string; container: HTMLElement | null }>({
    announcement: '',
    container: null,
  })

  const moveWithButton = (from: number, to: number) => {
    const total = count()

    if (to < 0 || to >= total || !tracker.begin(from, to)) return

    const label = labelFor(from)

    move(from, to)
    state.announcement = label
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
    void tick().then(() => tracker.finish(state.container))
  }

  return { moveWithButton, state }
}
