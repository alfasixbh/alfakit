import { effectiveErrorNotifications, resolveRequestErrorNotification } from './error-notifications'
import { router } from './http'
import {
  callPageMethod,
  PageMethodError,
  type CallPageMethodOptions,
  type PageMethodArguments,
} from './page-methods'
import { PollScheduler } from './poll'
import type { NotificationSchema } from './schema/notifications'
import type { PageSchema, PanelSchema } from './schema/panel'
import { matchesKeyBinding } from './utils/keybindings'

/**
 * The renderer-independent part of the custom page helpers (`usePageMethod`,
 * `useReloadProps`, `useLiveProps`, `useShortcut`): what happens after a call, partial
 * reloads of view data, polling and Echo listeners for it, and keyboard shortcuts.
 */

export interface PageMethodCallOptions<TArgs = PageMethodArguments> {
  /** Named forms (`<PageForm name>`) whose state is sent and validated with the call. */
  forms?: string[]
  /**
   * Apply the expected outcome right away; return a function that undoes it. It runs when
   * the call fails (validation, authorisation, network…).
   */
  optimistic?: (args: TArgs | undefined) => (() => void) | void
  /** Show the call's notifications (and a toast for failed requests). Default true. */
  toasts?: boolean
  /** Follow a redirect returned by the method. Default true. */
  followRedirects?: boolean
  signal?: AbortSignal
}

export interface PageMethodRuntime {
  token: string
  panel: Pick<PanelSchema, 'endpoints' | 'errorNotifications'>
  /** The open page: its `errorNotifications` override the panel's. */
  page?: Pick<PageSchema, 'errorNotifications'> | null
  showToast: (notification: NotificationSchema) => void
  t: (key: string, replacements?: Record<string, string | number>, fallback?: string) => string
}

/**
 * Call an `#[Expose]` page method and act on the answer: toasts for its notifications, a
 * visit for a redirect, a partial reload for `reloadProps()`. Resolves with the method's
 * return value; rejects with `PageMethodError` after showing its toast (validation errors
 * are not toasted, the hooks expose them as `errors`).
 */
export async function runPageMethod<TResult = unknown, TArgs = PageMethodArguments>(
  method: string,
  args: TArgs | undefined,
  runtime: PageMethodRuntime,
  options: PageMethodCallOptions<TArgs> = {},
): Promise<TResult> {
  const endpoint = runtime.panel.endpoints.pageCall

  if (!endpoint) {
    throw new Error('AlfaKit: this panel has no page method endpoint (endpoints.pageCall).')
  }

  const toasts = options.toasts !== false
  const rollback = options.optimistic?.(args)
  const callOptions: CallPageMethodOptions = {
    token: runtime.token,
    endpoint,
    uploadEndpoint: runtime.panel.endpoints.upload,
    forms: options.forms,
    signal: options.signal,
  }

  try {
    const response = await callPageMethod<TResult>(
      method,
      args as PageMethodArguments | undefined,
      callOptions,
    )

    if (toasts) response.notifications.forEach((notification) => runtime.showToast(notification))

    if (response.redirect && options.followRedirects !== false) {
      router.visit(response.redirect)
    } else if (response.reload) {
      reloadPageProps(response.reload === true ? undefined : response.reload)
    }

    return response.result
  } catch (error) {
    rollback?.()

    if (toasts) {
      const notifications = error instanceof PageMethodError ? error.notifications : []

      if (notifications.length > 0) {
        notifications.forEach((notification) => runtime.showToast(notification))
      } else {
        const cause = error instanceof PageMethodError ? (error.cause ?? error) : error
        const notification = resolveRequestErrorNotification(
          cause,
          effectiveErrorNotifications(runtime.panel, runtime.page),
          runtime.t,
        )

        if (notification) runtime.showToast(notification)
      }
    }

    throw error
  }
}

// ---------------------------------------------------------------- View data reloads

/**
 * Inertia partial reload of view data (`getViewData()` keys, or `page` for the page's own
 * blocks). Without props, every prop reloads. Resolves when the reload finished.
 */
export function reloadPageProps(only?: string[]): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()

  return new Promise((resolve) => {
    router.reload({
      ...(only && only.length > 0 ? { only } : {}),
      onFinish: () => resolve(),
    })
  })
}

/** Polls of view data: props with the same interval share one partial reload. */
export const propsPollScheduler = new PollScheduler((props) => reloadPageProps(props))

/**
 * Reload view data props every `interval` (`'10s'`, `5000`), paused while the tab is
 * hidden. Returns the function that stops it.
 */
export function pollPageProps(
  only: string[],
  interval: string | number | null | undefined,
): () => void {
  const stops = only.map((prop) => propsPollScheduler.subscribe(prop, interval))

  return () => stops.forEach((stop) => stop())
}

/** The part of a Laravel Echo channel used to listen for events. */
export interface EchoEventChannel {
  listen(event: string, callback: (payload: unknown) => void): unknown
  stopListening?(event: string, callback?: (payload: unknown) => void): unknown
}

/** The part of Laravel Echo used for page events (`window.Echo`). */
export interface EchoWithChannels {
  private(channel: string): EchoEventChannel
  channel?(channel: string): EchoEventChannel
  join?(channel: string): EchoEventChannel
}

export interface PageEventsOptions {
  /** Channel name, e.g. `stores.12.orders`. */
  channel: string
  /** Event names as Echo expects them (`.OrderUpdated` for `broadcastAs()` names). */
  events: string[]
  /** `private` (default), `public` or `presence`. */
  visibility?: 'private' | 'public' | 'presence'
  echo?: EchoWithChannels | null
  onEvent: (event: string, payload: unknown) => void
}

/**
 * Listen for broadcast events with Laravel Echo (`window.Echo`). A no-op without Echo and
 * during server rendering. Returns the function that stops listening.
 */
export function listenForPageEvents(options: PageEventsOptions): () => void {
  const echo =
    options.echo === undefined
      ? typeof window === 'undefined'
        ? null
        : ((window as unknown as { Echo?: EchoWithChannels }).Echo ?? null)
      : options.echo

  if (!echo || typeof echo.private !== 'function' || !options.channel) return () => {}

  const visibility = options.visibility ?? 'private'
  const channel =
    visibility === 'public' && echo.channel
      ? echo.channel(options.channel)
      : visibility === 'presence' && echo.join
        ? echo.join(options.channel)
        : echo.private(options.channel)

  let active = true
  const callbacks = options.events.map((event) => {
    const callback = (payload: unknown) => {
      if (active) options.onEvent(event, payload)
    }

    channel.listen(event, callback)

    return [event, callback] as const
  })

  return () => {
    active = false
    callbacks.forEach(([event, callback]) => channel.stopListening?.(event, callback))
  }
}

export interface LivePropsOptions {
  /** Reload the props every interval (`'15s'`). */
  poll?: string | number | null
  /** Reload them when one of these broadcast events arrives. */
  echo?: Omit<PageEventsOptions, 'onEvent'> | null
}

/**
 * Keep view data props fresh: polling, Echo events, or both. Returns the cleanup.
 */
export function watchPageProps(only: string[], options: LivePropsOptions): () => void {
  const stops: Array<() => void> = []

  if (options.poll) stops.push(pollPageProps(only, options.poll))

  if (options.echo) {
    stops.push(listenForPageEvents({ ...options.echo, onEvent: () => void reloadPageProps(only) }))
  }

  return () => stops.forEach((stop) => stop())
}

// ---------------------------------------------------------------- Shortcuts

export interface ShortcutOptions {
  /** Also fire while an input, textarea, select or editable element has focus. */
  allowInInputs?: boolean
  /** Default true. */
  preventDefault?: boolean
}

/**
 * Register a global keyboard shortcut (`'mod+k'`, `'/'`, `'f2'`, `'esc'`; `mod` is ⌘ on macOS
 * and Ctrl elsewhere). Without `allowInInputs`, shortcuts without a modifier are ignored
 * while the user types. Returns the cleanup.
 */
export function registerShortcut(
  keys: string | string[],
  handler: (event: KeyboardEvent) => void,
  options: ShortcutOptions = {},
): () => void {
  if (typeof window === 'undefined') return () => {}

  const bindings = Array.isArray(keys) ? keys : [keys]

  const listener = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return

    const target = event.target as HTMLElement | null
    const inEditable =
      target !== null &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

    for (const binding of bindings) {
      const hasModifier = /(^|\+)(mod|ctrl|control|meta|cmd|command|alt|option)\+/i.test(binding)

      if (inEditable && !hasModifier && !options.allowInInputs) continue

      if (matchesKeyBinding(event, binding)) {
        if (options.preventDefault !== false) event.preventDefault()
        handler(event)

        return
      }
    }
  }

  window.addEventListener('keydown', listener)

  return () => window.removeEventListener('keydown', listener)
}
