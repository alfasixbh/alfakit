import type { ActionVariant, Color, IconName, Size } from './common'

export interface NotificationActionSchema {
  name: string
  label: string
  url?: string
  openUrlInNewTab?: boolean
  markAsRead?: boolean
  /** In the database notifications panel: mark the notification as unread again. */
  markAsUnread?: boolean
  close?: boolean
  color?: Color
  icon?: IconName
  /** `size()`: the button size (`xs` when not set). */
  size?: Size
  variant: ActionVariant
  dispatch?: { event: string; data: Record<string, unknown> }
}

/** The undo offer of a toast (`Action::undoable()`). */
export interface NotificationUndoSchema {
  /** Encrypted, single-use, short-lived undo token. */
  token: string
  /** How long the offer stands. */
  seconds: number
  /** The undo endpoint (POST `{undo: token}`). */
  url: string | null
}

export interface NotificationSchema {
  id: string
  title?: string
  body?: string
  status?: Color
  icon?: IconName
  iconColor?: Color
  /** `color()`: tints the notification's background. */
  color?: Color
  /** Milliseconds, or `'persistent'`. */
  duration?: number | 'persistent' | null
  actions?: NotificationActionSchema[]
  /** Custom renderer component name. */
  view?: string
  viewData?: Record<string, unknown>
  date?: string
  /** `Action::undoable()`: an "Undo" button with a countdown. */
  undo?: NotificationUndoSchema
  readAt?: string | null
  format: 'alfakit'
}

export interface DatabaseNotificationsResponse {
  notifications: NotificationSchema[]
  unreadCount: number
  hasMore: boolean
  page: number
}
