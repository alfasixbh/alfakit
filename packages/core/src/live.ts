import { pollComponent, reloadPolledComponents } from './poll'
import { listenForRecordChanges, withEcho, type EchoLike, type RecordChange } from './realtime'
import type { RecordKey } from './schema/common'
import type { LiveUpdatesSchema } from './schema/realtime'
import { createStore, type Store } from './store'

export interface LiveUpdatesState {
  /** Created records not shown yet (the pill). */
  pending: number
  /** Listening over Echo (false: polling or nothing). */
  connected: boolean
}

export interface LiveUpdatesOptions {
  live: LiveUpdatesSchema
  /** The poll target to refresh (`table`, `relationManager:…`, `widget:…`). */
  target: string
  /** The component polls already (`poll()`): no fallback polling then. */
  polling?: boolean
  /**
   * Whether a record is on screen. Updates and deletions of records that aren't are
   * ignored (another page of the table).
   */
  isShown?: (key: RecordKey) => boolean
  /** Fetch fresh schemas (default: one partial reload). */
  refresh?: (targets: string[]) => Promise<void> | void
  /** Start fallback polling (default: the shared poll scheduler). */
  poll?: (target: string, interval: string) => () => void
  echo?: EchoLike | null
}

/**
 * Keeps a table or widget current: refreshes it (debounced, in place, so selection, scroll,
 * filters and open modals stay) when its records change, counts created records for the
 * "new records" pill, and polls instead when Echo isn't available.
 */
export class LiveUpdates {
  readonly store: Store<LiveUpdatesState> = createStore<LiveUpdatesState>({
    pending: 0,
    connected: false,
  })

  private timer: ReturnType<typeof setTimeout> | null = null
  private shownKeys: ReadonlySet<string> | null = null

  constructor(private readonly options: LiveUpdatesOptions) {}

  /**
   * The keys of the records on screen (`shownRecordKeys(table.records)`): updates and
   * deletions of other records are ignored. Null: every change refreshes.
   */
  setShownKeys(keys: ReadonlySet<string> | null): void {
    this.shownKeys = keys
  }

  get pending(): number {
    return this.store.get().pending
  }

  start(): () => void {
    const { live } = this.options
    const fallback = () => {
      if (this.options.polling || !live.fallbackPollingInterval) return

      return (this.options.poll ?? pollComponent)(this.options.target, live.fallbackPollingInterval)
    }

    if (live.channels.length === 0) {
      const stop = fallback()

      return () => stop?.()
    }

    const stop = withEcho(
      (echo) => {
        this.store.update({ connected: true })

        const stops = live.channels.map((channel) =>
          listenForRecordChanges(channel, (change) => this.onChange(change), { echo }),
        )

        return () => stops.forEach((cleanup) => cleanup())
      },
      { echo: this.options.echo, onUnavailable: fallback },
    )

    return () => {
      stop()
      this.cancel()
      this.store.update({ connected: false })
    }
  }

  onChange(change: RecordChange): void {
    if (change.event === 'created' && this.options.live.newRecordsIndicator) {
      this.store.update({ pending: this.pending + 1 })

      return
    }

    if (change.event !== 'created') {
      if (this.options.isShown && !this.options.isShown(change.key)) return
      if (this.shownKeys && !this.shownKeys.has(String(change.key))) return
    }

    this.schedule()
  }

  /** Show the created records (the pill's button): refresh now and reset the count. */
  async showPending(): Promise<void> {
    this.cancel()
    this.store.update({ pending: 0 })
    await this.refreshNow()
  }

  /** Refresh now. */
  async refreshNow(): Promise<void> {
    await (this.options.refresh ?? reloadPolledComponents)([this.options.target])
  }

  private schedule(): void {
    this.cancel()
    this.timer = setTimeout(() => {
      this.timer = null
      void this.refreshNow()
    }, this.options.live.debounce ?? 500)
  }

  private cancel(): void {
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
  }
}

/** Keys of the records a table shows (for `LiveUpdatesOptions.isShown`). */
export function shownRecordKeys(
  records: ReadonlyArray<{ key?: unknown }> | null | undefined,
): Set<string> {
  const keys = new Set<string>()

  for (const record of records ?? []) {
    if (typeof record.key === 'string' || typeof record.key === 'number')
      keys.add(String(record.key))
  }

  return keys
}
