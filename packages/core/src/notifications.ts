import { requestJson } from './http'
import type { DatabaseNotificationsResponse, NotificationSchema } from './schema/notifications'
import { createStore, type Store } from './store'
import { parseInterval } from './utils/format'

export interface NotificationCenterState {
  notifications: NotificationSchema[]
  unreadCount: number
  loading: boolean
  hasMore: boolean
  page: number
}

export interface NotificationEndpoints {
  notifications: string
  notificationsReadAll: string
  notificationsDestroyAll: string
}

/**
 * Database notifications (bell menu): fetching, marking as read, polling.
 */
export class NotificationCenter {
  public readonly store: Store<NotificationCenterState>

  private pollTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly endpoints: NotificationEndpoints,
    initialUnread = 0,
  ) {
    this.store = createStore<NotificationCenterState>({
      notifications: [],
      unreadCount: initialUnread,
      loading: false,
      hasMore: false,
      page: 0,
    })
  }

  async load(): Promise<void> {
    this.store.update({ loading: true })

    try {
      const response = await requestJson<DatabaseNotificationsResponse>(
        this.endpoints.notifications,
      )

      this.store.set((state) => {
        // Keep pages added with "Load more" when polling refreshes the first page.
        if (state.page > 1) {
          const fresh = new Set(response.notifications.map((notification) => notification.id))

          return {
            ...state,
            notifications: [
              ...response.notifications,
              ...state.notifications.filter((notification) => !fresh.has(notification.id)),
            ],
            unreadCount: response.unreadCount,
            loading: false,
          }
        }

        return {
          ...state,
          notifications: response.notifications,
          unreadCount: response.unreadCount,
          hasMore: response.hasMore,
          page: response.page,
          loading: false,
        }
      })
    } catch {
      this.store.update({ loading: false })
    }
  }

  /** Append the next page of notifications ("Load more"). */
  async loadMore(): Promise<void> {
    const { hasMore, loading, page } = this.store.get()

    if (!hasMore || loading) {
      return
    }

    this.store.update({ loading: true })

    try {
      const response = await requestJson<DatabaseNotificationsResponse>(
        this.endpoints.notifications,
        { query: { page: page + 1 } },
      )

      this.store.set((state) => {
        const known = new Set(state.notifications.map((notification) => notification.id))

        return {
          ...state,
          notifications: [
            ...state.notifications,
            ...response.notifications.filter((notification) => !known.has(notification.id)),
          ],
          unreadCount: response.unreadCount,
          hasMore: response.hasMore,
          page: response.page,
          loading: false,
        }
      })
    } catch {
      this.store.update({ loading: false })
    }
  }

  async markAsRead(id: string): Promise<void> {
    const response = await requestJson<{ unreadCount: number }>(
      `${this.endpoints.notifications}/${encodeURIComponent(id)}/read`,
      { method: 'POST' },
    )

    this.store.set((state) => ({
      ...state,
      unreadCount: response.unreadCount,
      notifications: state.notifications.map((notification) =>
        notification.id === id
          ? { ...notification, readAt: new Date().toISOString() }
          : notification,
      ),
    }))
  }

  /** `markAsUnread()` notification action: the notification counts as unread again. */
  async markAsUnread(id: string): Promise<void> {
    const response = await requestJson<{ unreadCount: number }>(
      `${this.endpoints.notifications}/${encodeURIComponent(id)}/read`,
      { method: 'POST', body: { unread: true } },
    )

    this.store.set((state) => ({
      ...state,
      unreadCount: response.unreadCount,
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, readAt: null } : notification,
      ),
    }))
  }

  async markAllAsRead(): Promise<void> {
    await requestJson(this.endpoints.notificationsReadAll, { method: 'POST' })

    this.store.set((state) => ({
      ...state,
      unreadCount: 0,
      notifications: state.notifications.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? new Date().toISOString(),
      })),
    }))
  }

  async clear(): Promise<void> {
    await requestJson(this.endpoints.notificationsDestroyAll, { method: 'DELETE' })

    this.store.update({ notifications: [], unreadCount: 0, hasMore: false })
  }

  /** Refresh the unread count on an interval (`'30s'`). */
  startPolling(interval: string | number | null | undefined): void {
    this.stopPolling()

    const milliseconds = parseInterval(interval)

    if (!milliseconds) {
      return
    }

    this.pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return
      }

      void this.load()
    }, milliseconds)
  }

  stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }
}

/** Dedupe flashed notifications so a preserved-state visit doesn't re-toast them. */
export class FlashNotificationTracker {
  private readonly seen = new Set<string>()

  fresh(notifications: NotificationSchema[] | undefined): NotificationSchema[] {
    const result: NotificationSchema[] = []

    for (const notification of notifications ?? []) {
      if (!this.seen.has(notification.id)) {
        this.seen.add(notification.id)
        result.push(notification)
      }
    }

    return result
  }
}

/** Window event the database notifications panel listens to, to open itself. */
export const OPEN_DATABASE_NOTIFICATIONS_EVENT = 'alfakit:open-database-notifications'

/**
 * Open the database notifications panel from anywhere (a custom component, a keyboard
 * shortcut). Actions do the same with `->openDatabaseNotifications()`.
 */
export function openDatabaseNotifications(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_DATABASE_NOTIFICATIONS_EVENT))
  }
}

/** Run `callback` whenever something asks the notifications panel to open. */
export function onOpenDatabaseNotifications(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  window.addEventListener(OPEN_DATABASE_NOTIFICATIONS_EVENT, callback)

  return () => window.removeEventListener(OPEN_DATABASE_NOTIFICATIONS_EVENT, callback)
}

/** Window event that closes a notification toast; `detail.id` is the notification's id. */
export const CLOSE_NOTIFICATION_EVENT = 'alfakit:close-notification'

/**
 * Filament's event name, listened to as well so migrated code that dispatches
 * `close-notification` with `{ id }` keeps working.
 */
export const FILAMENT_CLOSE_NOTIFICATION_EVENT = 'close-notification'

/**
 * Close a notification toast by its id: the one given to `Notification::make('greeting')`
 * (or read with `$notification->getId()` after sending). Unknown ids are ignored.
 * PHP notification actions can do the same with
 * `->dispatch('alfakit:close-notification', ['id' => $id])`.
 */
export function closeNotification(id: string): void {
  if (typeof window !== 'undefined' && id !== '') {
    window.dispatchEvent(new CustomEvent(CLOSE_NOTIFICATION_EVENT, { detail: { id } }))
  }
}

/**
 * Run `callback` with the id of each notification something asks to close (from
 * `closeNotification()` or a `close-notification` event). Returns an unsubscribe function.
 */
export function onCloseNotification(callback: (id: string) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail
    const id =
      detail !== null && typeof detail === 'object' ? (detail as { id?: unknown }).id : undefined

    if ((typeof id === 'string' && id !== '') || typeof id === 'number') {
      callback(String(id))
    }
  }

  window.addEventListener(CLOSE_NOTIFICATION_EVENT, listener)
  window.addEventListener(FILAMENT_CLOSE_NOTIFICATION_EVENT, listener)

  return () => {
    window.removeEventListener(CLOSE_NOTIFICATION_EVENT, listener)
    window.removeEventListener(FILAMENT_CLOSE_NOTIFICATION_EVENT, listener)
  }
}

/**
 * `Notification::color()`: inline styles that tint a notification's background with `value`
 * (a CSS colour, the renderer's `cssColor()`). `toast` sets the custom properties sonner
 * reads (`--normal-bg`, `--normal-border`); `item` is a background for a list row (the
 * database notifications menu).
 */
export function notificationTintStyles(value: string): {
  toast: Record<string, string>
  item: Record<string, string>
} {
  return {
    toast: {
      '--normal-bg': `color-mix(in oklab, ${value} 12%, var(--popover))`,
      '--normal-border': `color-mix(in oklab, ${value} 35%, var(--border))`,
    },
    item: { backgroundColor: `color-mix(in oklab, ${value} 10%, transparent)` },
  }
}
