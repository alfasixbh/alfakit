import type { ActionSchema } from './actions'
import type { BaseComponent } from './components'

/** One changed attribute of a version; values are display text from the server. */
export interface RecordVersionChangeSchema {
  attribute: string
  label: string
  old: string | null
  new: string | null
  /** Long and rich text: a word diff of `old` → `new`. */
  diff?: Array<{ type: 'equal' | 'insert' | 'delete'; text: string }>
}

export interface RecordVersionSchema {
  id: number
  /** `created`, `updated`, `deleted`, `restored` or `reverted` (a restored version). */
  event: string
  eventLabel: string
  author?: string
  /** ISO 8601; format with the panel's formatter. */
  createdAt?: string
  /** The newest version (the record as it is now). */
  current?: true
  changes: RecordVersionChangeSchema[]
}

/** The version list of the History slide-over (`HistoryAction`). */
export interface RecordVersionsSchema extends BaseComponent {
  type: 'RecordVersions'
  versions: RecordVersionSchema[]
  /** "Restore this version", run with the argument `version`; absent without the update ability. */
  restoreAction?: ActionSchema
  /** The actions whose modal holds the list, outermost first (`['history']`). */
  actionPath?: string[]
  /** Action endpoint component of those actions; absent for `page`. */
  actionComponent?: string
  emptyLabel: string
}
