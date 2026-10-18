import { HttpError, PAGE_EXPIRED_STATUS, router } from './http'
import type { NotificationSchema } from './schema/notifications'
import type { ErrorNotificationsSchema, PageSchema, PanelSchema } from './schema/panel'

type ErrorNotificationsConfig = ErrorNotificationsSchema | false | null | undefined

/**
 * The notification for a failed internal request (action, modal, live refresh): the
 * panel's `errorNotifications` text for the status when there is one, otherwise a generic
 * "request failed" toast carrying the server's message (which Laravel only fills in while
 * `app.debug` is on). Null for validation errors (422, shown on the fields), expired pages
 * (reloaded) and aborted requests, so a failure never passes silently.
 */
export function resolveRequestErrorNotification(
  error: unknown,
  config: ErrorNotificationsConfig,
  t: (key: string, replacements?: Record<string, string | number>, fallback?: string) => string,
): NotificationSchema | null {
  if (error instanceof Error && error.name === 'AbortError') return null

  const status = error instanceof HttpError ? error.status : 0

  if (status === 422 || status === PAGE_EXPIRED_STATUS) return null

  if (status > 0) {
    const outcome = errorNotificationOutcome(status, config)

    // `hiddenErrorNotification()`: the failure is caught and nothing is shown.
    if (outcome === 'hidden') return null

    const configured = outcome === 'show' ? resolveErrorNotification(status, config) : null

    if (configured) return configured
  }

  const message = error instanceof HttpError ? error.message : null

  return {
    id: `alfakit-request-error-${status}`,
    title: t('request_failed', {}, 'The request failed.'),
    body: message ? escapeHtml(message) : undefined,
    status: 'danger',
    format: 'alfakit',
  }
}

/**
 * How an HTTP error status is handled under `errorNotifications`: `show` the configured
 * text, `hidden` (caught, nothing shown), `disabled` (default handling) or `none` (error
 * notifications are off, or nothing is configured for it).
 */
export function errorNotificationOutcome(
  status: number,
  config: ErrorNotificationsConfig,
): 'show' | 'hidden' | 'disabled' | 'none' {
  if (!config || status === PAGE_EXPIRED_STATUS) return 'none'

  const entry = config[String(status)] ?? config.default

  if (!entry) return 'none'
  if (entry.hidden) return 'hidden'
  if (entry.disabled) return 'disabled'

  return entry.title ? 'show' : 'none'
}

/**
 * The notification for an HTTP error status from the panel's `errorNotifications` (the
 * status' own text, else `default`), or null when error notifications are off or the
 * status is hidden or disabled.
 */
export function resolveErrorNotification(
  status: number,
  config: ErrorNotificationsConfig,
): NotificationSchema | null {
  if (errorNotificationOutcome(status, config) !== 'show' || !config) return null

  const message = config[String(status)] ?? config.default

  if (!message?.title) return null

  return {
    id: `alfakit-error-${status}`,
    title: message.title,
    body: message.body ? escapeHtml(message.body) : undefined,
    status: 'danger',
    icon: message.icon ?? undefined,
    format: 'alfakit',
  }
}

/**
 * The error notifications in force: the open page's override (`$hasErrorNotifications`,
 * `setUpErrorNotifications()`) when it has one, otherwise the panel's.
 */
export function effectiveErrorNotifications(
  panel: Pick<PanelSchema, 'errorNotifications'> | null | undefined,
  page: Pick<PageSchema, 'errorNotifications'> | null | undefined,
): ErrorNotificationsSchema | false | undefined {
  if (page && page.errorNotifications !== undefined) return page.errorNotifications

  return panel?.errorNotifications
}

// ---------------------------------------------------------------- Request error reporter

let requestErrorReporter: ((error: unknown) => void) | null = null

/**
 * Register what happens to a failed internal request nobody handled itself (form live
 * refreshes, step validation…). The renderer's boot code shows the configured error
 * notification. Returns a function that removes the reporter.
 */
export function setRequestErrorReporter(reporter: ((error: unknown) => void) | null): () => void {
  requestErrorReporter = reporter

  return () => {
    if (requestErrorReporter === reporter) requestErrorReporter = null
  }
}

/** Hand a failed internal request to the registered reporter (no-op without one). */
export function reportRequestError(error: unknown): void {
  requestErrorReporter?.(error)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Show a notification instead of Inertia's error modal when a visit (page load or action)
 * fails with an HTTP error, following the current panel's `errorNotifications`. Browser
 * only; returns a function that removes the listener.
 */
export function installErrorNotifications(
  getPanel: () => { errorNotifications?: ErrorNotificationsConfig } | null | undefined,
  show: (notification: NotificationSchema) => void,
): () => void {
  if (typeof window === 'undefined') return () => {}

  return router.on('httpException', (event) => {
    const status = event.detail.response.status
    const config = getPanel()?.errorNotifications
    const outcome = errorNotificationOutcome(status, config)

    // Hidden statuses are caught without a notification.
    if (outcome === 'hidden') {
      event.preventDefault()

      return
    }

    const notification = resolveErrorNotification(status, config)

    if (!notification) return

    event.preventDefault()
    show(notification)
  })
}
