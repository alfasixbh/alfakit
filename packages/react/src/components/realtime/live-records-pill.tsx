import { LiveUpdates, shownRecordKeys, type LiveUpdatesSchema, type RecordKey } from '@alfakit/core'
import { ArrowUpIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useChoice, usePollComponent } from '../../context'
import { useStore } from '../../hooks/use-store'
import { Button } from '../ui/button'

/**
 * Follow `live()` updates of a table or widget: refresh it in place when its records
 * change, polling instead without Echo. Returns the controller (its store counts created
 * records for `<LiveRecordsPill>`), or null without `live()`.
 */
export function useLiveUpdates(
  live: LiveUpdatesSchema | undefined,
  target: string,
  options: { polling?: boolean; records?: ReadonlyArray<{ key?: RecordKey }> | null } = {},
): LiveUpdates | null {
  const poll = usePollComponent()
  const key = live ? JSON.stringify(live) : ''
  const polling = options.polling
  const records = options.records

  const controller = useMemo(
    () => (live ? new LiveUpdates({ live, target, polling, poll }) : null),
    // `live` is compared by value (`key`): a reload brings a new object with the same settings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, target, polling, poll],
  )

  // Updates of records on other pages don't refresh the table.
  useEffect(() => {
    controller?.setShownKeys(records === undefined ? null : shownRecordKeys(records))
  }, [controller, records])

  useEffect(() => controller?.start(), [controller])

  return controller
}

/** "3 new records — show": created records the table doesn't show yet. */
export function LiveRecordsPill({ live }: { live: LiveUpdates }) {
  const choice = useChoice()
  const { pending } = useStore(live.store)

  return (
    <div data-slot="live-records" aria-live="polite" className="flex justify-center">
      {pending > 0 && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="rounded-full shadow-sm"
          onClick={() => void live.showPending()}
        >
          <ArrowUpIcon aria-hidden="true" />
          {choice(
            'realtime.new_records',
            pending,
            {},
            '{1} :count new record — show|[2,*] :count new records — show',
          )}
        </Button>
      )}
    </div>
  )
}
