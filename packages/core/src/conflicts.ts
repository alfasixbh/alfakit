import type { FormStore } from './form'
import { requestJson, router } from './http'
import { listenForRecordChanges, type EchoLike, type RecordChange } from './realtime'
import type { RecordKey } from './schema/common'
import type { FormBlock } from './schema/form'
import type { PageSchema } from './schema/panel'
import { createStore, type Store } from './store'

/** Request input the Edit page's save sends the loaded record version in (`RecordVersion::INPUT`). */
export const RECORD_VERSION_INPUT = 'recordVersion'

/** Validation error key of a save refused because of a conflict (`RecordVersion::CONFLICT_ERROR`). */
export const CONFLICT_ERROR_KEY = 'alfakitConflict'

// ---------------------------------------------------------------- Page-wide state

let recordVersion: string | null = null
let lastSubmitAt = 0
let conflictForm: FormStore | null = null
const saveConflictListeners = new Set<() => void>()

/** The version the next save sends (set by the conflict monitor of the open Edit page). */
export function setRecordVersion(version: string | null): void {
  recordVersion = version
}

/** What `ActionRunner` adds to page actions as `recordVersion` (null outside Edit pages). */
export function currentRecordVersion(): string | null {
  return recordVersion
}

/** Called by `ActionRunner` when it sends a page action with the record version. */
export function markRecordSubmitted(now: number = Date.now()): void {
  lastSubmitAt = now
}

/** Called by `ActionRunner` when the server refused a save (`alfakitConflict` error). */
export function reportSaveConflict(): void {
  saveConflictListeners.forEach((listener) => listener())
}

/** Run `listener` when a save is refused. Returns the cleanup. */
export function onSaveConflict(listener: () => void): () => void {
  saveConflictListeners.add(listener)

  return () => {
    saveConflictListeners.delete(listener)
  }
}

/** The Edit page's form publishes its store so the banner can diff and merge it. */
export function registerConflictForm(store: FormStore): () => void {
  conflictForm = store

  return () => {
    if (conflictForm === store) conflictForm = null
  }
}

export function getConflictForm(): FormStore | null {
  return conflictForm
}

/** The page's main form block (`form`), wherever it sits in the content. */
export function findPageFormBlock(
  page: Pick<PageSchema, 'content'> | null | undefined,
): FormBlock | null {
  const search = (blocks: unknown[]): FormBlock | null => {
    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue

      const candidate = block as Record<string, unknown>

      if (candidate.type === 'Form' && candidate.component === 'form')
        return candidate as unknown as FormBlock

      // Any wrapper, e.g. the edit form inside combined relation manager tabs
      // (`RelationManagers.content.block`, W-S5-03). Form state is data, never blocks.
      for (const [key, value] of Object.entries(candidate)) {
        if (key === 'state' || !value || typeof value !== 'object') continue

        const found = search(Array.isArray(value) ? value : [value])

        if (found) return found
      }
    }

    return null
  }

  return search(page?.content ?? [])
}

// ---------------------------------------------------------------- Monitor

/** A field somebody else changed, with the saved value and the user's unsaved one. */
export interface ConflictField {
  path: string
  label: string
  /** The saved value, as text (null: empty). */
  theirs: string | null
  /** The user's current value, as text (null: empty). */
  mine: string | null
  /** The saved value as form state, to adopt it ("use theirs"). */
  value: unknown
  /** Both changed the field, differently. */
  conflicting: boolean
}

export interface EditConflict {
  /** `broadcast`: another user saved (realtime); `save`: the server refused this save. */
  source: 'broadcast' | 'save'
  event: RecordChange['event'] | 'updated'
  /** Who saved, when known. */
  by: RecordKey | null
  /** Their name, when known (from the record's presence channel). */
  name: string | null
  /** When it happened (milliseconds). */
  at: number
}

export interface ConflictMonitorState {
  conflict: EditConflict | null
  /** The changed fields, once reviewed. */
  fields: ConflictField[] | null
  loading: boolean
  /** Loading the changes failed. */
  failed: boolean
}

export interface ConflictMonitorOptions {
  /** The loaded record version (`page.conflicts.version`). */
  version: string
  /** Page context token. */
  token: string
  /** `panel.endpoints.conflicts`. */
  endpoint?: string
  /** The record's presence channel (`page.presence.channel`), with `realtime()`. */
  channel?: string | null
  /** The form state the page was loaded with. */
  original?: Record<string, unknown>
  /** The current user's key: their own saves in another tab still count, this tab's don't. */
  self?: RecordKey | null
  /** Name of a user on the record (presence), for "Dana saved changes". */
  resolveName?: (id: RecordKey) => string | null
  echo?: EchoLike | null
  now?: () => number
}

/**
 * Edit-conflict detection for one Edit page: sends the loaded version with saves, shows a
 * conflict when another user saves the record (broadcast) or the server refuses a save,
 * and offers review (a diff against the unsaved values), reload and keep-mine.
 */
export class ConflictMonitor {
  readonly store: Store<ConflictMonitorState> = createStore<ConflictMonitorState>({
    conflict: null,
    fields: null,
    loading: false,
    failed: false,
  })

  private latestVersion: string | null = null
  private token: string

  constructor(private readonly options: ConflictMonitorOptions) {
    this.token = options.token
  }

  /** The page's context token is re-issued with every response. */
  setToken(token: string): void {
    this.token = token
  }

  get state(): ConflictMonitorState {
    return this.store.get()
  }

  start(): () => void {
    setRecordVersion(this.options.version)

    const stopSave = onSaveConflict(() => this.flag({ source: 'save', event: 'updated', by: null }))
    const stopListening = this.options.channel
      ? listenForRecordChanges(this.options.channel, (change) => this.onChange(change), {
          kind: 'presence',
          echo: this.options.echo,
        })
      : () => {}

    return () => {
      stopSave()
      stopListening()

      if (currentRecordVersion() === this.options.version) setRecordVersion(null)
    }
  }

  /** A broadcast change of the record. */
  onChange(change: RecordChange): void {
    if (change.event === 'created') return

    const now = this.now()

    // This tab's own save (when its socket id didn't reach the server).
    if (this.isSelf(change.by) && now - lastSubmitAt < 10_000) return

    this.flag({
      source: 'broadcast',
      event: change.event,
      by: change.by ?? null,
      at: change.at ?? now,
    })
  }

  /** Load what changed: label, saved value and the user's unsaved value per field. */
  async review(): Promise<ConflictField[]> {
    if (!this.options.endpoint) return []

    this.store.update({ loading: true, failed: false })

    try {
      const response = await requestJson<{ version: string | null; fields: ConflictField[] }>(
        this.options.endpoint,
        {
          method: 'POST',
          body: {
            token: this.token,
            original: this.options.original ?? {},
            state: conflictForm?.state.values ?? this.options.original ?? {},
          },
        },
      )

      this.latestVersion = response.version
      this.store.update({ fields: response.fields, loading: false })

      return response.fields
    } catch {
      this.store.update({ loading: false, failed: true })

      return []
    }
  }

  /** Keep the unsaved values: the next save overwrites the other user's changes. */
  async keepMine(): Promise<void> {
    if (this.latestVersion === null) await this.review()

    if (this.latestVersion !== null) setRecordVersion(this.latestVersion)

    this.store.set({ conflict: null, fields: null, loading: false, failed: false })
  }

  /** Adopt the saved value of one field into the form. */
  useTheirs(path: string): void {
    const field = this.state.fields?.find((candidate) => candidate.path === path)

    if (!field) return

    conflictForm?.setValue(path, field.value)

    const fields = (this.state.fields ?? []).filter((candidate) => candidate.path !== path)
    this.store.update({ fields })
  }

  /** Discard the unsaved values and load the saved record. */
  reload(): void {
    if (typeof window === 'undefined') return

    const form = conflictForm

    router.reload({
      onSuccess: (page) => {
        const block = findPageFormBlock((page.props as { page?: PageSchema }).page)

        if (block && form) form.fill(block)
      },
    })

    this.store.set({ conflict: null, fields: null, loading: false, failed: false })
  }

  /** Hide the banner without doing anything. */
  dismiss(): void {
    this.store.update({ conflict: null })
  }

  private flag(conflict: Omit<EditConflict, 'name' | 'at'> & { at?: number }): void {
    const name =
      conflict.by !== null && conflict.by !== undefined
        ? (this.options.resolveName?.(conflict.by) ?? null)
        : null

    this.latestVersion = null
    this.store.set({
      conflict: { ...conflict, name, at: conflict.at ?? this.now() },
      fields: null,
      loading: false,
      failed: false,
    })
  }

  private isSelf(id: RecordKey | null | undefined): boolean {
    return (
      id !== null &&
      id !== undefined &&
      this.options.self !== null &&
      this.options.self !== undefined &&
      String(id) === String(this.options.self)
    )
  }

  private now(): number {
    return this.options.now?.() ?? Date.now()
  }
}

/**
 * The banner's translation key and English fallback for a conflict (`:name` and `:time`
 * are replaced by the renderer, `:time` with `LocaleFormatter.relative()`).
 */
export function conflictMessage(conflict: EditConflict): { key: string; fallback: string } {
  if (conflict.source === 'save') {
    return {
      key: 'realtime.conflict.refused',
      fallback: 'Your changes were not saved: this record was changed after you opened it.',
    }
  }

  const deleted = conflict.event === 'deleted'

  if (conflict.name) {
    return deleted
      ? { key: 'realtime.conflict.deleted_by', fallback: ':name deleted this record :time' }
      : { key: 'realtime.conflict.saved_by', fallback: ':name saved changes :time' }
  }

  return deleted
    ? { key: 'realtime.conflict.deleted_by_someone', fallback: 'Someone deleted this record :time' }
    : { key: 'realtime.conflict.saved_by_someone', fallback: 'Someone saved changes :time' }
}
