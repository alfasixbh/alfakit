import type { NotificationSchema } from './schema/notifications'
import type { ToastPosition } from './schema/panel'
import type { RealtimeSchema } from './schema/realtime'

/** Broadcast type of a toast pushed with `Notification::broadcast()`. */
export const BROADCAST_NOTIFICATION = 'alfakit.notification'

/** Broadcast type sent by `sendToDatabase(..., isEventDispatched: true)`. */
export const DATABASE_NOTIFICATIONS_SENT = 'alfakit.database-notifications.sent'

/** Window event the notifications menu listens to, to reload itself. */
export const DATABASE_NOTIFICATIONS_EVENT = 'alfakit:database-notifications-sent'

type NotificationCallback = (payload: Record<string, unknown>) => void
type EventCallback = (payload: Record<string, unknown>) => void

/** The part of a Laravel Echo private channel Alfakit uses. */
export interface EchoChannelLike {
  notification(callback: NotificationCallback): unknown
  stopListeningForNotification?(callback: NotificationCallback): unknown
  listen?(event: string, callback: EventCallback): unknown
  stopListening?(event: string, callback?: EventCallback): unknown
}

/** The part of a Laravel Echo presence channel Alfakit uses (`Echo.join()`). */
export interface EchoPresenceChannelLike extends EchoChannelLike {
  here(callback: (members: unknown[]) => void): unknown
  joining(callback: (member: unknown) => void): unknown
  leaving(callback: (member: unknown) => void): unknown
  whisper?(event: string, data: Record<string, unknown>): unknown
  listenForWhisper?(event: string, callback: (data: Record<string, unknown>) => void): unknown
}

/** The part of Laravel Echo Alfakit uses (`window.Echo`). */
export interface EchoLike {
  private(channel: string): EchoChannelLike
  join?(channel: string): EchoPresenceChannelLike
  leave?(channel: string): void
  socketId?(): string | undefined
}

/**
 * The app's Laravel Echo instance, when one is set up as `window.Echo` (or was created by
 * `resolveEcho()`). Always null on the server, so SSR never touches it.
 */
export function getEcho(): EchoLike | null {
  if (typeof window === 'undefined') {
    return null
  }

  const echo = (window as unknown as { Echo?: unknown }).Echo

  if (echo && typeof (echo as EchoLike).private === 'function') {
    return echo as EchoLike
  }

  return createdEcho
}

// ---------------------------------------------------------------- Connection

/** The settings `configureRealtime()` takes (`PanelSchema.realtime`). */
export type RealtimeConfig = RealtimeSchema

/** Options for creating Echo: the panel's Echo options plus its auth endpoint and CSRF token. */
export type EchoConnectionOptions = Record<string, unknown> & {
  authEndpoint?: string
  csrfToken?: string
}

/**
 * Creates the Echo instance when the app has no `window.Echo` (`createAlfakit({ echo })`),
 * e.g. `(options) => new Echo({ ...options, broadcaster: 'reverb', Pusher })`.
 */
export type EchoFactory = (
  options: EchoConnectionOptions,
) => EchoLike | null | undefined | Promise<EchoLike | null | undefined>

type ModuleLoader = (specifier: string) => Promise<Record<string, unknown>>

let realtimeConfig: (RealtimeConfig & { csrfToken?: string }) | null = null
let echoFactory: EchoFactory | null = null
let createdEcho: EchoLike | null = null
let pendingEcho: Promise<EchoLike | null> | null = null

// The packages are optional peers the app installs: the specifier is a variable so bundlers
// don't require them, and a missing package just means "no Echo".
let loadModule: ModuleLoader = (specifier) =>
  import(/* @vite-ignore */ /* webpackIgnore: true */ specifier) as Promise<Record<string, unknown>>

/**
 * Set the panel's realtime settings (renderers call this with `panel.realtime` and the
 * CSRF token) and, optionally, an Echo instance or factory from `createAlfakit({ echo })`.
 */
export function configureRealtime(
  config: RealtimeConfig | null | undefined,
  options: { echo?: EchoLike | EchoFactory | null; csrfToken?: string } = {},
): void {
  realtimeConfig = config ? { ...config, csrfToken: options.csrfToken } : null

  if (options.echo !== undefined) {
    if (typeof options.echo === 'function') {
      echoFactory = options.echo
    } else {
      createdEcho = options.echo
      echoFactory = null
    }
  }
}

/** The settings given to `configureRealtime()`. */
export function realtimeSettings(): RealtimeConfig | null {
  return realtimeConfig
}

/** Whether `Panel::realtime()` is on for this page. */
export function isRealtimeEnabled(): boolean {
  return Boolean(realtimeConfig?.live)
}

/**
 * The Echo instance to use: `window.Echo`, one made by the `createAlfakit({ echo })`
 * factory, or (with `config('alfakit.broadcasting.echo')`) one made from `laravel-echo`
 * and `pusher-js` if the app installed them. Null when none is available or on the server.
 */
export function resolveEcho(): Promise<EchoLike | null> {
  const existing = getEcho()

  if (existing || typeof window === 'undefined') {
    return Promise.resolve(existing)
  }

  pendingEcho ??= createEcho().then((echo) => {
    createdEcho = echo ?? null

    // Try again on the next call when nothing could be created.
    if (!createdEcho) pendingEcho = null

    return createdEcho
  })

  return pendingEcho
}

async function createEcho(): Promise<EchoLike | null> {
  const config = realtimeConfig
  const options: EchoConnectionOptions = {
    ...(config?.echo ?? {}),
    ...(config?.authEndpoint ? { authEndpoint: config.authEndpoint } : {}),
    ...(config?.csrfToken ? { csrfToken: config.csrfToken } : {}),
  }

  try {
    if (echoFactory) {
      return (await echoFactory(options)) ?? null
    }

    if (!config?.live || !config.echo) {
      return null
    }

    const [echoModule, pusherModule] = await Promise.all([
      loadModule('laravel-echo'),
      loadModule('pusher-js'),
    ])
    const Echo = (echoModule.default ?? echoModule.Echo) as
      (new (options: Record<string, unknown>) => EchoLike) | undefined
    const Pusher = pusherModule.default ?? pusherModule.Pusher

    if (typeof Echo !== 'function') {
      return null
    }

    ;(window as unknown as { Pusher?: unknown }).Pusher ??= Pusher

    return new Echo({ broadcaster: 'reverb', ...options, Pusher })
  } catch {
    return null
  }
}

/** The socket id of the current Echo connection, sent as `X-Socket-ID` so Laravel's `toOthers()` skips this tab. */
export function currentSocketId(): string | undefined {
  try {
    return getEcho()?.socketId?.() || undefined
  } catch {
    return undefined
  }
}

/** `X-Socket-ID` when connected (merged into the requests of the renderers). */
export function realtimeHeaders(): Record<string, string> {
  const id = currentSocketId()

  return id ? { 'X-Socket-ID': id } : {}
}

/** Forget the connection and settings (tests). */
export function resetRealtime(options: { loader?: ModuleLoader } = {}): void {
  realtimeConfig = null
  echoFactory = null
  createdEcho = null
  pendingEcho = null
  channelRefs.clear()

  if (options.loader) loadModule = options.loader
}

// ---------------------------------------------------------------- Shared channels

const channelRefs = new Map<string, number>()

/**
 * Use a channel of `echo` until the returned release function is called. Echo shares a
 * channel object per name, so it is left only when its last user releases it (a record's
 * presence avatars and conflict banner share its presence channel).
 */
export function acquireChannel<T extends 'private' | 'presence'>(
  echo: EchoLike,
  kind: T,
  name: string,
): {
  channel: T extends 'presence' ? EchoPresenceChannelLike : EchoChannelLike
  release: () => void
} | null {
  const channel = kind === 'presence' ? echo.join?.(name) : echo.private(name)

  if (!channel) return null

  const key = name
  channelRefs.set(key, (channelRefs.get(key) ?? 0) + 1)
  let released = false

  return {
    channel: channel as T extends 'presence' ? EchoPresenceChannelLike : EchoChannelLike,
    release: () => {
      if (released) return
      released = true

      const count = (channelRefs.get(key) ?? 1) - 1

      if (count <= 0) {
        channelRefs.delete(key)
        echo.leave?.(name)
      } else {
        channelRefs.set(key, count)
      }
    },
  }
}

/**
 * Run `connect` with Echo as soon as it is available: right away with `window.Echo`, else
 * once `resolveEcho()` settles. `onUnavailable` runs when there is no Echo. Returns the
 * cleanup, which also cancels a pending connection.
 */
export function withEcho(
  connect: (echo: EchoLike) => (() => void) | void,
  options: { echo?: EchoLike | null; onUnavailable?: () => (() => void) | void } = {},
): () => void {
  let cleanup: (() => void) | void
  let active = true

  const start = (echo: EchoLike | null) => {
    if (!active) return

    cleanup = echo ? connect(echo) : options.onUnavailable?.()
  }

  if (options.echo !== undefined) {
    start(options.echo)
  } else {
    const echo = getEcho()

    if (echo || typeof window === 'undefined') {
      start(echo)
    } else {
      void resolveEcho().then(start)
    }
  }

  return () => {
    active = false
    cleanup?.()
  }
}

// ---------------------------------------------------------------- Record changes

/** Echo event of `RecordChanged` (`broadcastAs()` is `alfakit.record`). */
export const RECORD_CHANGED_EVENT = '.alfakit.record'

/** A record was created, updated, deleted or restored. Keys only: refetch to see the data. */
export interface RecordChange {
  event: 'created' | 'updated' | 'deleted' | 'restored'
  /** The model class with `-` for `\\`. */
  model: string
  key: string | number
  /** The user who changed it, when known. */
  by?: string | number | null
  /** Milliseconds since the epoch. */
  at?: number
}

function asRecordChange(payload: Record<string, unknown>): RecordChange | null {
  const event = payload.event
  const key = payload.key

  if (
    (event !== 'created' && event !== 'updated' && event !== 'deleted' && event !== 'restored') ||
    (typeof key !== 'string' && typeof key !== 'number')
  ) {
    return null
  }

  return {
    event,
    key,
    model: typeof payload.model === 'string' ? payload.model : '',
    by: typeof payload.by === 'string' || typeof payload.by === 'number' ? payload.by : null,
    at: typeof payload.at === 'number' ? payload.at : Date.now(),
  }
}

/**
 * Listen for record changes on a channel (`private` for models, `presence` for a record).
 * Returns the cleanup (a no-op without Echo).
 */
export function listenForRecordChanges(
  channelName: string,
  callback: (change: RecordChange) => void,
  options: { kind?: 'private' | 'presence'; echo?: EchoLike | null } = {},
): () => void {
  return withEcho(
    (echo) => {
      const acquired = acquireChannel(echo, options.kind ?? 'private', channelName)

      if (!acquired) return

      const listener: EventCallback = (payload) => {
        const change = asRecordChange(payload)

        if (change) callback(change)
      }

      acquired.channel.listen?.(RECORD_CHANGED_EVENT, listener)

      return () => {
        acquired.channel.stopListening?.(RECORD_CHANGED_EVENT, listener)
        acquired.release()
      }
    },
    { echo: options.echo },
  )
}

// ---------------------------------------------------------------- Notifications

export interface RealtimeSubscriptionOptions {
  /** The user's private channel (`PanelSchema.realtime.channel`). */
  channel: string
  /** Defaults to `window.Echo`, or the Echo `resolveEcho()` creates. */
  echo?: EchoLike | null
  /** A broadcast toast arrived. */
  onNotification: (notification: NotificationSchema) => void
  /** A database notification was stored: reload the bell. */
  onDatabaseNotificationsSent?: () => void
}

/**
 * Listen for the user's broadcast notifications. Returns the unsubscribe function (a no-op
 * when Echo is missing). Each toast is delivered once, even if Echo reconnects or the
 * subscription is made twice (React strict mode).
 */
export function subscribeToNotifications(options: RealtimeSubscriptionOptions): () => void {
  if (!options.channel) {
    return () => {}
  }

  const seen = new Set<string>()

  return withEcho(
    (echo) => {
      let active = true

      const callback: NotificationCallback = (payload) => {
        if (!active) return

        if (payload.type === DATABASE_NOTIFICATIONS_SENT) {
          options.onDatabaseNotificationsSent?.()

          return
        }

        if (payload.format !== 'alfakit') return

        const id = typeof payload.id === 'string' ? payload.id : ''

        if (id !== '' && seen.has(id)) return
        if (id !== '') seen.add(id)

        const { type: _type, ...notification } = payload

        options.onNotification(notification as unknown as NotificationSchema)
      }

      const channel = echo.private(options.channel)
      channel.notification(callback)

      return () => {
        active = false
        channel.stopListeningForNotification?.(callback)
      }
    },
    { echo: options.echo },
  )
}

/** Tell mounted notification menus to reload (`DATABASE_NOTIFICATIONS_EVENT`). */
export function announceDatabaseNotificationsSent(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DATABASE_NOTIFICATIONS_EVENT))
  }
}

/** Run `callback` whenever a database notification is announced. Returns the cleanup. */
export function onDatabaseNotificationsSent(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  window.addEventListener(DATABASE_NOTIFICATIONS_EVENT, callback)

  return () => window.removeEventListener(DATABASE_NOTIFICATIONS_EVENT, callback)
}

/**
 * Offset of the panel's toaster: toasts at the top start below the sticky top bar (3.5rem
 * high) instead of covering the breadcrumbs, search and switchers, on phones too (where they
 * span the screen). The other sides keep sonner's defaults.
 */
export const PANEL_TOAST_OFFSET: { top: string } = { top: '4.5rem' }

export type SonnerPosition =
  'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

/**
 * The toaster position for the panel's `toastPosition()` (logical: `start`/`end`) in the
 * current reading direction. Defaults to the top end.
 */
export function resolveToastPosition(
  position: ToastPosition | null | undefined,
  direction: 'ltr' | 'rtl',
): SonnerPosition {
  const [vertical, horizontal] = (position ?? 'top-end').split('-') as [
    'top' | 'bottom',
    'start' | 'center' | 'end',
  ]

  if (horizontal === 'center') {
    return `${vertical}-center`
  }

  const isLeft = (horizontal === 'start') === (direction === 'ltr')

  return `${vertical}-${isLeft ? 'left' : 'right'}`
}
