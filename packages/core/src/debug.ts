import type { FormStore } from './form'
import { createStore, type Store } from './store'

/**
 * One internal request (`requestJson()`) as the debug panel shows it.
 */
export interface DebugRequest {
  id: number
  method: string
  url: string
  /** HTTP status, or 0 when the request failed before a response arrived. */
  status: number
  /** Round trip in milliseconds, as measured in the browser. */
  duration: number
  /** Server time from the `Server-Timing: alfakit;dur=…` header, when the server sent one. */
  serverDuration: number | null
  requestBytes: number
  responseBytes: number
  startedAt: number
  /** The parsed response body (or the raw text when it is not JSON). */
  response: unknown
  /** The request body, when it was JSON. */
  request: unknown
}

export interface DebugState {
  enabled: boolean
  /** Most recent first, capped at `MAX_REQUESTS`. */
  requests: DebugRequest[]
  /** The form stores currently alive on the page (page forms, filters, modal forms). */
  forms: FormStore[]
}

export const MAX_DEBUG_REQUESTS = 25

let nextRequestId = 1

/**
 * What the developer debug panel reads: internal requests captured by `requestJson()` and
 * the form stores alive on the page. Recording is off until a renderer enables it on a
 * page that carries the `alfakitDebug` prop, so production builds record nothing.
 */
export class DebugRecorder {
  public readonly store: Store<DebugState> = createStore<DebugState>({
    enabled: false,
    requests: [],
    forms: [],
  })

  get enabled(): boolean {
    return this.store.get().enabled
  }

  setEnabled(enabled: boolean): void {
    if (this.store.get().enabled !== enabled) {
      this.store.update({ enabled })
    }
  }

  /** Begin timing a request; returns a function to call with the outcome. */
  begin(method: string, url: string, body: unknown): (outcome: DebugRequestOutcome) => void {
    if (!this.enabled) {
      return () => {}
    }

    const startedAt = Date.now()
    const started = now()

    return (outcome) => {
      const entry: DebugRequest = {
        id: nextRequestId++,
        method,
        url,
        status: outcome.status,
        duration: Math.round((now() - started) * 10) / 10,
        serverDuration: parseServerTiming(outcome.serverTiming),
        requestBytes: byteLength(body),
        responseBytes: outcome.responseText?.length ?? 0,
        startedAt,
        response: outcome.response,
        request: body instanceof FormData ? '[FormData]' : body,
      }

      this.store.update({
        requests: [entry, ...this.store.get().requests].slice(0, MAX_DEBUG_REQUESTS),
      })
    }
  }

  registerForm(form: FormStore): void {
    if (!this.enabled) {
      return
    }

    const forms = this.store.get().forms

    if (!forms.includes(form)) {
      this.store.update({ forms: [...forms, form] })
    }
  }

  unregisterForm(form: FormStore): void {
    const forms = this.store.get().forms

    if (forms.includes(form)) {
      this.store.update({ forms: forms.filter((item) => item !== form) })
    }
  }

  clearRequests(): void {
    this.store.update({ requests: [] })
  }
}

export interface DebugRequestOutcome {
  status: number
  serverTiming?: string | null
  responseText?: string | null
  response?: unknown
}

/** The recorder shared by `requestJson()`, `FormStore` and the renderers' debug drawers. */
export const debugRecorder = new DebugRecorder()

/** `alfakit;dur=12.3` → 12.3 (the first `dur` of the header). */
export function parseServerTiming(header: string | null | undefined): number | null {
  if (!header) {
    return null
  }

  const match = /dur=([\d.]+)/.exec(header)

  return match ? Number.parseFloat(match[1]!) : null
}

/** Approximate size in bytes of a JSON payload (the whole page props, a request body…). */
export function byteLength(value: unknown): number {
  if (value === undefined || value === null) {
    return 0
  }

  if (value instanceof FormData) {
    let total = 0

    value.forEach((entry) => {
      total += typeof entry === 'string' ? entry.length : entry.size
    })

    return total
  }

  const text = typeof value === 'string' ? value : safeStringify(value)

  return typeof TextEncoder === 'undefined' ? text.length : new TextEncoder().encode(text).length
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? ''
  } catch {
    return ''
  }
}

function now(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now()
}
