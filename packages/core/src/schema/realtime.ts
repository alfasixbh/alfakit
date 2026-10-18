/** `PanelSchema.realtime`: the user's channel and, with `Panel::realtime()`, the connection. */
export interface RealtimeSchema {
  /** The user's private channel for notifications (`App.Models.User.1`). */
  channel: string
  /** `Panel::realtime()`: presence, edit conflicts, live tables and widgets are on. */
  live?: boolean
  /** Where Echo authorises the panel's channels (`/_alfakit/broadcasting/auth`). */
  authEndpoint?: string
  /** Public Echo options from `config('alfakit.broadcasting.echo')`. */
  echo?: Record<string, unknown> | null
}

/** `Table::live()` / `Widget::live()`: where changes arrive and how to follow them. */
export interface LiveUpdatesSchema {
  /** Private channels of the followed models; empty without `Panel::realtime()`. */
  channels: string[]
  /** Milliseconds to wait for more changes before refreshing (default 500). */
  debounce?: number
  /** Poll at this interval (`'30s'`) when Echo isn't available. */
  fallbackPollingInterval?: string
  /** Tables: count created records in a "3 new records" pill instead of refreshing. */
  newRecordsIndicator?: boolean
}

/** Whether a user on a record page is editing it or just looking at it. */
export type PresenceState = 'editing' | 'viewing'

/** `PageSchema.presence` (record pages with `Panel::realtime()`). */
export interface PresenceSchema {
  /** The record's presence channel, without `presence-` (Echo adds it). */
  channel: string
  state: PresenceState
}

/** `PageSchema.conflicts` (Edit pages with `detectConflicts()`). */
export interface ConflictsSchema {
  /** The version of the record the form was loaded from. */
  version: string
}
