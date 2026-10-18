import { csrfHeader, HttpError, PAGE_EXPIRED_STATUS, reloadExpiredPage } from './http'
import { createStore, type Store } from './store'

/**
 * Streamed AI answers (alfasix/alfakit-ai `streaming()`): the server sends server-sent
 * events (`delta` with text as it is written, then `done` or `error`); this reads them with
 * `fetch`, so the request carries the session, CSRF token and a JSON body, and can be
 * cancelled. Everything the answer says, and its final clean-up, comes from the server.
 */

/** The registry key of the component that streams an answer into a modal form. */
export const AI_STREAM_REGISTRY_KEY = 'ai:stream'

export interface StreamEvent {
  event: string
  data: Record<string, unknown>
}

/**
 * Split server-sent events out of a growing buffer. Returns the complete events and what
 * is left of the buffer (an event still being received).
 */
export function parseEventStream(buffer: string): { events: StreamEvent[]; rest: string } {
  const events: StreamEvent[] = []
  const blocks = buffer.replace(/\r\n/g, '\n').split('\n\n')
  const rest = blocks.pop() ?? ''

  for (const block of blocks) {
    let event = 'message'
    const data: string[] = []

    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
    }

    if (data.length === 0) continue

    try {
      const parsed: unknown = JSON.parse(data.join('\n'))

      events.push({
        event,
        data: parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {},
      })
    } catch {
      // A malformed event is skipped; the stream carries on.
    }
  }

  return { events, rest }
}

/**
 * POST `body` to a streaming endpoint and call `onEvent` for each event. A server that
 * answers with JSON instead (no streaming) counts as one `done` event. Rejects with an
 * `HttpError` for error statuses and with an `AbortError` when `signal` aborts.
 */
export async function readEventStream(
  url: string,
  body: Record<string, unknown>,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'text/event-stream, application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...csrfHeader(),
    },
    body: JSON.stringify(body),
    signal,
  })

  if (response.status === PAGE_EXPIRED_STATUS) reloadExpiredPage()

  const type = response.headers.get('Content-Type') ?? ''

  if (!response.ok || !type.includes('text/event-stream') || !response.body) {
    const text = await response.text()
    let data: unknown

    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }

    if (!response.ok) {
      throw new HttpError(response.status, data, (data as { message?: string } | null)?.message)
    }

    onEvent({ event: 'done', data: (data as Record<string, unknown> | null) ?? {} })

    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()

    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parsed = parseEventStream(buffer)
    buffer = parsed.rest
    parsed.events.forEach(onEvent)
  }

  buffer += decoder.decode()
  parseEventStream(`${buffer}\n\n`).events.forEach(onEvent)
}

/**
 * What a screen reader hears while text streams: new text in batches at most every
 * `interval` ms, cut at a word boundary, so `aria-live="polite"` isn't flooded with
 * fragments. `flush()` returns everything not announced yet.
 */
export class StreamAnnouncer {
  private announced = 0
  private last = 0

  constructor(
    private readonly interval = 2000,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** The next announcement for the text so far, or null when it's too early. */
  next(text: string): string | null {
    if (this.now() - this.last < this.interval) return null

    const pending = text.slice(this.announced)
    const boundary = Math.max(pending.lastIndexOf(' '), pending.lastIndexOf('\n'))

    if (boundary <= 0) return null

    this.announced += boundary + 1
    this.last = this.now()

    return pending.slice(0, boundary).trim() || null
  }

  flush(text: string): string | null {
    const pending = text.slice(this.announced).trim()
    this.announced = text.length

    return pending || null
  }

  reset(): void {
    this.announced = 0
    this.last = 0
  }
}

export type AiStreamStatus = 'idle' | 'streaming' | 'done' | 'error' | 'cancelled'

export interface AiStreamState {
  status: AiStreamStatus
  /** The answer so far (plain text: it is shown as text, never as HTML). */
  text: string
  /** The latest batch for the polite live region. */
  announcement: string
  error: string | null
}

export interface AiStreamOptions {
  endpoint: string
  /** Called with the finished answer (cleaned up by the server). */
  onDone?: (text: string) => void
  /** Called with the server's (translated) message, or undefined for a generic one. */
  onError?: (message: string | undefined) => void
  onCancel?: () => void
  /** Milliseconds between two screen reader announcements. */
  announceInterval?: number
  /** Milliseconds between two updates of the visible text. */
  renderInterval?: number
  read?: typeof readEventStream
}

/**
 * Streams one answer for an `ai:stream` component: `start(token)` posts the token the
 * server issued, `cancel()` stops it. The visible text updates a few times a second and
 * the announcement in batches.
 */
export class AiStreamController {
  readonly store: Store<AiStreamState>
  private abort: AbortController | null = null
  private announcer: StreamAnnouncer
  private text = ''
  private timer: ReturnType<typeof setTimeout> | null = null
  private token: string | null = null

  constructor(private readonly options: AiStreamOptions) {
    this.announcer = new StreamAnnouncer(options.announceInterval ?? 2000)
    this.store = createStore<AiStreamState>({
      status: 'idle',
      text: '',
      announcement: '',
      error: null,
    })
  }

  get state(): AiStreamState {
    return this.store.get()
  }

  /** Stream the answer of `token` (a token already streamed is ignored). */
  async start(token: string): Promise<void> {
    if (token === this.token) return

    this.stop()
    this.token = token
    this.text = ''
    this.announcer.reset()
    this.store.set({ status: 'streaming', text: '', announcement: '', error: null })

    const abort = new AbortController()
    this.abort = abort
    let finished = false

    try {
      await (this.options.read ?? readEventStream)(
        this.options.endpoint,
        { token },
        (event) => {
          if (abort.signal.aborted || finished) return

          if (event.event === 'delta' && typeof event.data.text === 'string') {
            this.text += event.data.text
            this.schedule()
          } else if (event.event === 'done') {
            finished = true
            this.finish(typeof event.data.text === 'string' ? event.data.text : this.text)
          } else if (event.event === 'error') {
            finished = true
            this.fail(typeof event.data.message === 'string' ? event.data.message : undefined)
          }
        },
        abort.signal,
      )

      if (!finished && !abort.signal.aborted) this.fail(undefined)
    } catch (error) {
      if (abort.signal.aborted) return

      const message =
        error instanceof HttpError && error.status < 500 && error.status !== 403
          ? error.message
          : undefined

      this.fail(message)
    } finally {
      if (this.abort === abort) this.abort = null
    }
  }

  /** "Stop": the server stops generating; the partial answer is dropped. */
  cancel(): void {
    if (this.state.status !== 'streaming') return

    this.stop()
    this.store.set({
      status: 'cancelled',
      text: this.text,
      announcement: '',
      error: null,
    })
    this.options.onCancel?.()
  }

  dispose(): void {
    this.stop()
  }

  private stop(): void {
    this.abort?.abort()
    this.abort = null

    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private schedule(): void {
    if (this.timer !== null) return

    this.timer = setTimeout(() => {
      this.timer = null
      const announcement = this.announcer.next(this.text)

      this.store.set({
        ...this.state,
        text: this.text,
        announcement: announcement ?? this.state.announcement,
      })
    }, this.options.renderInterval ?? 60)
  }

  private finish(text: string): void {
    this.stop()
    this.store.set({
      status: 'done',
      text,
      announcement: this.announcer.flush(text) ?? '',
      error: null,
    })
    this.options.onDone?.(text)
  }

  private fail(message: string | undefined): void {
    this.stop()
    this.store.set({ ...this.state, status: 'error', text: this.text, error: message ?? '' })
    this.options.onError?.(message)
  }
}
