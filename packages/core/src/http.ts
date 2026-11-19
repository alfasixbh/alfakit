import type { VisitOptions } from '@inertiajs/core'
import { router } from '@inertiajs/core'
import { debugRecorder } from './debug'
import { resolvePartialProps } from './partial-props'
import { invalidatePrefetchedPages, isMutatingRequest } from './prefetch'
import { realtimeHeaders } from './realtime'

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: unknown,
    message?: string,
  ) {
    super(message ?? `Request failed with status ${status}`)
    this.name = 'HttpError'
  }

  /** Laravel validation errors (`{ field: [messages] }`) when status is 422. */
  get errors(): Record<string, string[]> {
    const data = this.data as { errors?: Record<string, string[]> } | null

    return data?.errors ?? {}
  }
}

/** A background request that took longer than `Panel::requestTimeout()` and was given up. */
export class RequestTimeoutError extends HttpError {
  constructor(public readonly seconds: number) {
    super(408, null, 'The request took too long.')
    this.name = 'RequestTimeoutError'
  }
}

/**
 * The CSRF header for a request. Prefers the `XSRF-TOKEN` cookie, which Laravel refreshes
 * on every response (so it survives login and session regeneration), over the meta tag
 * rendered with the first page.
 */
export function csrfHeader(): Record<string, string> {
  if (typeof document === 'undefined') {
    return {}
  }

  const cookie = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='))

  if (cookie) {
    return { 'X-XSRF-TOKEN': decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) }
  }

  const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')

  return meta?.content ? { 'X-CSRF-TOKEN': meta.content } : {}
}

/** HTTP status Laravel uses for an expired CSRF token or page context token. */
export const PAGE_EXPIRED_STATUS = 419

let reloading = false

let expiredPageGuard: (() => boolean) | null = null

/**
 * Ask before an expired page is reloaded on its own. The guard answers true when it has
 * taken over (it told the user and offers the reload itself, see
 * `installExpiredPageNotice()`). Returns a function that removes it.
 */
export function setExpiredPageGuard(guard: (() => boolean) | null): () => void {
  expiredPageGuard = guard

  return () => {
    if (expiredPageGuard === guard) expiredPageGuard = null
  }
}

/**
 * Reload the page to get fresh tokens. Called when an internal endpoint answers 419.
 * With `force` the guard is not asked (the user chose to reload).
 */
export function reloadExpiredPage(force = false): void {
  if (reloading || typeof window === 'undefined') {
    return
  }

  if (!force && expiredPageGuard?.()) {
    return
  }

  reloading = true
  window.location.reload()
}

/**
 * What is on screen and may hold changes the user has not saved (form stores add
 * themselves while something renders them).
 */
export const unsavedWork = new Set<{ readonly isDirty: boolean }>()

export function hasUnsavedWork(): boolean {
  for (const item of unsavedWork) {
    if (item.isDirty) return true
  }

  return false
}

let requestTimeout: number | null = null

/**
 * `Panel::requestTimeout()`: how many seconds a background request (`requestJson()`) may
 * take before it is given up with a `RequestTimeoutError`; null for no limit.
 */
export function setRequestTimeout(seconds: number | null | undefined): void {
  requestTimeout = typeof seconds === 'number' && seconds > 0 ? seconds : null
}

export function getRequestTimeout(): number | null {
  return requestTimeout
}

/**
 * Reload instead of showing Inertia's error modal when a visit fails with 419. Returns
 * a function that removes the listener.
 */
export function reloadOnExpiredPage(): () => void {
  return router.on('httpException', (event) => {
    if (event.detail.response.status === PAGE_EXPIRED_STATUS) {
      event.preventDefault()
      reloadExpiredPage()
    }
  })
}

export interface JsonRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, unknown>
  signal?: AbortSignal
  headers?: Record<string, string>
  /** Seconds before the request is given up; `false` for no limit. Default: the panel's `requestTimeout()`. */
  timeout?: number | false
}

export function buildQuery(params: Record<string, unknown>, prefix = ''): string {
  const parts: string[] = []

  const append = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => append(`${key}[${index}]`, item))

      return
    }

    if (typeof value === 'object') {
      for (const [nestedKey, nested] of Object.entries(value as Record<string, unknown>)) {
        append(`${key}[${nestedKey}]`, nested)
      }

      return
    }

    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  }

  for (const [key, value] of Object.entries(params)) {
    append(prefix ? `${prefix}[${key}]` : key, value)
  }

  return parts.join('&')
}

/**
 * JSON request to an internal endpoint with CSRF and credentials. Throws `HttpError`
 * for non-2xx responses.
 */
export async function requestJson<T>(url: string, options: JsonRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  let target = url

  if (options.query) {
    const query = buildQuery(options.query)

    if (query) {
      target += (target.includes('?') ? '&' : '?') + query
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    // `X-Socket-ID`: broadcasts caused by this request skip this tab (`toOthers()`).
    ...realtimeHeaders(),
    ...options.headers,
  }

  if (method !== 'GET') {
    Object.assign(headers, csrfHeader())
  }

  let body: BodyInit | undefined

  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  // Recorded for the developer debug panel only while it is enabled on the page.
  const record = debugRecorder.begin(method, target, options.body)

  // A file being sent takes as long as it takes: only JSON requests are limited.
  const limit =
    options.timeout === false || options.body instanceof FormData
      ? null
      : (options.timeout ?? requestTimeout)
  const controller = limit ? new AbortController() : null
  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const forwardAbort = () => controller?.abort()

  if (controller && limit) {
    timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, limit * 1000)

    if (options.signal?.aborted) controller.abort()
    else options.signal?.addEventListener('abort', forwardAbort, { once: true })
  }

  let response: Response
  let text: string

  try {
    response = await fetch(target, {
      method,
      headers,
      body,
      credentials: 'same-origin',
      signal: controller?.signal ?? options.signal,
    })
    // The limit covers the answer's body too, not only its headers.
    text = await response.text()
  } catch (error) {
    const failure = timedOut ? new RequestTimeoutError(limit ?? 0) : error

    record({ status: 0, response: failure instanceof Error ? failure.message : String(failure) })

    throw failure
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', forwardAbort)
  }

  const data = text ? safeParse(text) : null

  record({
    status: response.status,
    serverTiming: response.headers.get('Server-Timing'),
    responseText: text,
    response: data,
  })

  if (response.status === PAGE_EXPIRED_STATUS) {
    reloadExpiredPage()
  }

  if (!response.ok) {
    throw new HttpError(response.status, data, (data as { message?: string } | null)?.message)
  }

  // Inline edits, reordering, field actions…: prefetched pages and table totals may be stale.
  if (isMutatingRequest(target, method)) invalidatePrefetchedPages()

  return data as T
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * Perform an Inertia visit that stays on the current page (used after actions so the
 * server redirects back and props refresh).
 */
export function inertiaPost(
  url: string,
  data: Record<string, unknown>,
  options: Omit<VisitOptions, 'method' | 'data'> = {},
): void {
  const socket = realtimeHeaders()

  postsInFlight++

  router.post(url, data as never, {
    preserveScroll: true,
    preserveState: true,
    ...options,
    onFinish: (visit) => {
      options.onFinish?.(visit)
      postsInFlight = Math.max(0, postsInFlight - 1)

      if (postsInFlight === 0) runHeldVisits()
    },
    // `X-Socket-ID`: broadcasts caused by this request skip this tab (`toOthers()`).
    ...(socket['X-Socket-ID'] ? { headers: { ...socket, ...options.headers } } : {}),
  })
}

/**
 * Visit with the partial-reload props resolved: outside panels the `page` prop renderer
 * components ask for is replaced by the standalone components' own props.
 */
export function inertiaVisit(url: string, options: VisitOptions = {}): void {
  holdWhilePosting(() => router.visit(url, { preserveScroll: true, ...withPartialProps(options) }))
}

export function inertiaReload(options: Parameters<typeof router.reload>[0] = {}): void {
  holdWhilePosting(() => router.reload(withPartialProps(options)))
}

let postsInFlight = 0

let heldVisits: Array<() => void> = []

/**
 * A new Inertia visit cancels the one in flight. For an action that is fine the other way
 * round, but a table reload (a search still settling, polling) that starts while an action
 * is being posted would cancel the action's visit: the server has run it, and the browser
 * never hears the result (the modal stays open, no notification). Reloads wait for it.
 */
function holdWhilePosting(visit: () => void): void {
  if (postsInFlight > 0) heldVisits.push(visit)
  else visit()
}

function runHeldVisits(): void {
  const visits = heldVisits

  heldVisits = []

  for (const visit of visits) visit()
}

function withPartialProps<T extends { only?: string[] }>(options: T): T {
  const only = resolvePartialProps(options.only)

  if (only === options.only) return options

  const resolved = { ...options }

  if (only === undefined) {
    delete resolved.only
  } else {
    resolved.only = only
  }

  return resolved
}

export { router }
