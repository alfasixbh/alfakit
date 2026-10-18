import {
  LiveUpdates,
  shownRecordKeys,
  type LiveUpdatesSchema,
  type LiveUpdatesState,
  type RecordKey,
} from '@alfakit/core'
import { untrack } from 'svelte'
import { usePollComponent } from '../../context.svelte'

export interface LiveUpdatesBinding {
  readonly controller: LiveUpdates | null
  readonly state: LiveUpdatesState
}

/**
 * Follow `live()` updates of a table or widget: refresh it in place when its records
 * change, polling instead without Echo. Call during component initialisation (effects run
 * in the browser only). `state.pending` counts created records for `<LiveRecordsPill>`.
 */
export function useLiveUpdates(
  source: () => {
    live: LiveUpdatesSchema | undefined
    target: string
    polling?: boolean
    records?: ReadonlyArray<{ key?: RecordKey }> | null
  },
): LiveUpdatesBinding {
  const poll = usePollComponent()
  let controller = $state.raw<LiveUpdates | null>(null)
  let state = $state.raw<LiveUpdatesState>({ pending: 0, connected: false })

  const key = $derived.by(() => {
    const { live, target, polling, records } = source()

    return JSON.stringify([live ?? null, target, Boolean(polling), records === undefined])
  })

  $effect(() => {
    void key

    // Recreated only when `key` changes, not on every reload of the records.
    const { live, target, polling } = untrack(source)

    if (!live) {
      controller = null

      return
    }

    const next = new LiveUpdates({
      live,
      target,
      polling,
      poll,
    })

    controller = next
    state = next.store.get()

    const unsubscribe = next.store.subscribe((value) => (state = value))
    const stop = next.start()

    return () => {
      stop()
      unsubscribe()
    }
  })

  // Updates of records on other pages don't refresh the table.
  $effect(() => {
    const { records } = source()

    controller?.setShownKeys(records === undefined ? null : shownRecordKeys(records))
  })

  return {
    get controller() {
      return controller
    },
    get state() {
      return state
    },
  }
}
