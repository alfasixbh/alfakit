import {
  LiveUpdates,
  shownRecordKeys,
  type LiveUpdatesSchema,
  type LiveUpdatesState,
  type RecordKey,
} from '@alfakit/core'
import { onMounted, onScopeDispose, shallowRef, watch, type ShallowRef } from 'vue'
import { usePollComponent } from '../../context'

/**
 * Follow `live()` updates of a table or widget: refresh it in place when its records
 * change, polling instead without Echo. Browser only. Returns the controller and its state
 * (`pending` counts created records for `<LiveRecordsPill>`).
 */
export function useLiveUpdates(
  source: () => {
    live: LiveUpdatesSchema | undefined
    target: string
    polling?: boolean
    records?: ReadonlyArray<{ key?: RecordKey }> | null
  },
): { controller: ShallowRef<LiveUpdates | null>; state: ShallowRef<LiveUpdatesState> } {
  const poll = usePollComponent()
  const controller = shallowRef<LiveUpdates | null>(null)
  const state = shallowRef<LiveUpdatesState>({ pending: 0, connected: false })
  let stop: (() => void) | null = null
  let unsubscribe: (() => void) | null = null

  const dispose = () => {
    stop?.()
    unsubscribe?.()
    stop = null
    unsubscribe = null
  }

  onMounted(() => {
    watch(
      () => {
        const { records } = source()

        return records
      },
      (records) =>
        controller.value?.setShownKeys(records === undefined ? null : shownRecordKeys(records)),
      { immediate: true },
    )

    watch(
      () => {
        const { live, target, polling, records } = source()

        return JSON.stringify([live ?? null, target, Boolean(polling), records === undefined])
      },
      () => {
        dispose()

        const { live, target, polling, records } = source()

        if (!live) {
          controller.value = null

          return
        }

        const next = new LiveUpdates({
          live,
          target,
          polling,
          poll,
        })

        controller.value = next
        next.setShownKeys(records === undefined ? null : shownRecordKeys(records))
        state.value = next.store.get()
        unsubscribe = next.store.subscribe((value) => (state.value = value))
        stop = next.start()
      },
      { immediate: true },
    )
  })

  onScopeDispose(dispose)

  return { controller, state }
}
