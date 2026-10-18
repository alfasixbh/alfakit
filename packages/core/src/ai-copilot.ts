import { readEventStream, StreamAnnouncer } from './ai-stream'
import { HttpError, requestJson } from './http'
import type { AiConversationSchema, AiCopilotSchema, AiMessageSchema } from './schema/ai'
import { createStore, type Store } from './store'

/**
 * The framework-agnostic half of the copilot (alfasix/alfakit-ai): the conversation, the
 * history list and the requests. Renderers draw the slide-over and bind it to this
 * controller. Nothing here decides anything: questions, tools, authorisation and the
 * proposed actions all run on the server, and an action only runs after `decide()`.
 */

/** The registry key of the copilot component. */
export const AI_COPILOT_REGISTRY_KEY = 'ai:copilot'

export type CopilotView = 'chat' | 'history'

export interface CopilotState {
  open: boolean
  view: CopilotView
  conversation: AiConversationSchema | null
  messages: AiMessageSchema[]
  conversations: AiConversationSchema[]
  /** A question is being answered. */
  sending: boolean
  /** A conversation or the history is loading. */
  loading: boolean
  /** Proposals with a decision in flight, by message id. */
  deciding: Record<number, 'confirm' | 'reject'>
  /** The last error; `message` is the server's (already translated), else show a generic one. */
  error: { message?: string } | null
  draft: string
  /**
   * `streaming()`: the answer being written (plain text) and the latest batch for the
   * polite live region; null when no answer streams.
   */
  streaming: { text: string; announcement: string } | null
}

export interface CopilotTotals {
  inputTokens: number
  outputTokens: number
  /** Present when the plugin has prices for the models used. */
  cost?: number
}

export interface CopilotControllerOptions {
  request?: typeof requestJson
  /** The page the user is on, sent as context. */
  pageUrl?: () => string | undefined
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
  /** Reads the streaming endpoint (tests replace it). */
  stream?: typeof readEventStream
}

interface SendResponse {
  conversation: AiConversationSchema
  messages: AiMessageSchema[]
}

const MAX_LENGTH = 4000

let temporaryId = 0

export class CopilotController {
  readonly store: Store<CopilotState>
  private readonly request: typeof requestJson
  private readonly storageKey: string
  private abort: AbortController | null = null

  constructor(
    readonly schema: AiCopilotSchema,
    private readonly options: CopilotControllerOptions = {},
  ) {
    this.request = options.request ?? requestJson
    this.storageKey = `alfakit-ai-copilot:${schema.endpoints.send}`
    this.store = createStore<CopilotState>({
      open: false,
      view: 'chat',
      conversation: null,
      messages: [],
      conversations: [],
      sending: false,
      loading: false,
      deciding: {},
      error: null,
      draft: '',
      streaming: null,
    })
  }

  get state(): CopilotState {
    return this.store.get()
  }

  subscribe(listener: (state: CopilotState) => void): () => void {
    return this.store.subscribe(listener)
  }

  // ---------------------------------------------------------------- Opening

  /** Open the slide-over, reloading the conversation the user had open in this tab. */
  open(): void {
    if (this.state.open) return

    this.store.update({ open: true })

    const remembered = this.rememberedConversation()

    if (this.state.conversation === null && remembered !== null) {
      void this.openConversation(remembered)
    }
  }

  close(): void {
    this.store.update({ open: false })
  }

  toggle(): void {
    if (this.state.open) this.close()
    else this.open()
  }

  setOpen(open: boolean): void {
    if (open) this.open()
    else this.close()
  }

  setDraft(draft: string): void {
    this.store.update({ draft: draft.slice(0, MAX_LENGTH) })
  }

  dismissError(): void {
    this.store.update({ error: null })
  }

  // ---------------------------------------------------------------- Conversations

  newConversation(): void {
    this.forget()
    this.store.update({ conversation: null, messages: [], view: 'chat', error: null })
  }

  async showHistory(): Promise<void> {
    this.store.update({ view: 'history', loading: true, error: null })

    try {
      const response = await this.request<{ conversations: AiConversationSchema[] }>(
        this.schema.endpoints.conversations,
      )

      this.store.update({ conversations: response.conversations, loading: false })
    } catch (error) {
      this.fail(error)
    }
  }

  showChat(): void {
    this.store.update({ view: 'chat' })
  }

  async openConversation(id: number): Promise<void> {
    this.store.update({ loading: true, view: 'chat', error: null })

    try {
      const response = await this.request<SendResponse>(this.url('conversation', id))

      this.remember(response.conversation.id)
      this.store.update({
        conversation: response.conversation,
        messages: response.messages,
        loading: false,
      })
    } catch (error) {
      // A conversation that is gone (deleted, other tenant) is simply not reopened.
      if (error instanceof HttpError && error.status === 404) {
        this.forget()
        this.store.update({ loading: false, conversation: null, messages: [] })

        return
      }

      this.fail(error)
    }
  }

  async deleteConversation(id: number): Promise<void> {
    try {
      await this.request(this.url('delete', id), { method: 'DELETE' })
    } catch (error) {
      this.fail(error)

      return
    }

    const current = this.state.conversation?.id === id

    if (current) this.forget()

    this.store.set((state) => ({
      ...state,
      conversations: state.conversations.filter((conversation) => conversation.id !== id),
      conversation: current ? null : state.conversation,
      messages: current ? [] : state.messages,
    }))
  }

  // ---------------------------------------------------------------- Asking

  /** Ask a question (the draft by default). Resolves once the answer arrived. */
  async send(text?: string): Promise<void> {
    const message = (text ?? this.state.draft).trim().slice(0, MAX_LENGTH)

    if (message === '' || this.state.sending) return

    const optimistic: AiMessageSchema = { id: --temporaryId, role: 'user', content: message }

    this.store.set((state) => ({
      ...state,
      draft: text === undefined ? '' : state.draft,
      sending: true,
      error: null,
      view: 'chat',
      messages: [...state.messages, optimistic],
    }))

    const body = {
      message,
      conversation: this.state.conversation?.id ?? undefined,
      page: this.options.pageUrl?.() ?? currentUrl(),
    }

    try {
      const response = this.schema.endpoints.stream
        ? await this.streamAnswer(this.schema.endpoints.stream, body)
        : await this.request<SendResponse>(this.schema.endpoints.send, { method: 'POST', body })

      // Stopped: `cancel()` already put things back.
      if (response === null) return

      this.remember(response.conversation.id)
      this.store.set((state) => ({
        ...state,
        sending: false,
        streaming: null,
        conversation: response.conversation,
        messages: [...state.messages.filter((item) => item !== optimistic), ...response.messages],
      }))
    } catch (error) {
      // The question was not answered: give it back to the composer.
      this.store.set((state) => ({
        ...state,
        sending: false,
        streaming: null,
        draft: state.draft === '' ? message : state.draft,
        messages: state.messages.filter((item) => item !== optimistic),
      }))
      this.fail(error)
    }
  }

  /**
   * Stop the answer being written. The question stays in the conversation on the server,
   * which is reloaded; a question that started a conversation goes back to the composer.
   */
  cancel(): void {
    if (!this.abort) return

    this.abort.abort()
    this.abort = null

    const conversation = this.state.conversation
    const question = [...this.state.messages].reverse().find((item) => item.role === 'user')

    this.store.set((state) => ({
      ...state,
      sending: false,
      streaming: null,
      draft:
        conversation === null && state.draft === '' && question ? question.content : state.draft,
      messages:
        conversation === null ? state.messages.filter((item) => item.id >= 0) : state.messages,
    }))

    if (conversation !== null) void this.openConversation(conversation.id)
  }

  private async streamAnswer(
    url: string,
    body: Record<string, unknown>,
  ): Promise<SendResponse | null> {
    const abort = new AbortController()
    const announcer = new StreamAnnouncer()
    let text = ''
    let result: SendResponse | null = null
    let failure: { message?: string; retryAfter?: number } | null = null

    this.abort = abort
    this.store.update({ streaming: { text: '', announcement: '' } })

    try {
      await (this.options.stream ?? readEventStream)(
        url,
        body,
        (event) => {
          if (event.event === 'delta' && typeof event.data.text === 'string') {
            text += event.data.text
            const announcement = announcer.next(text)

            this.store.set((state) => ({
              ...state,
              streaming: {
                text,
                announcement: announcement ?? state.streaming?.announcement ?? '',
              },
            }))
          } else if (event.event === 'done') {
            result = event.data as unknown as SendResponse
          } else if (event.event === 'error') {
            failure = event.data as { message?: string; retryAfter?: number }
          }
        },
        abort.signal,
      )
    } catch (error) {
      if (abort.signal.aborted) return null

      throw error
    } finally {
      if (this.abort === abort) this.abort = null
    }

    if (failure !== null) {
      throw new HttpError(429, failure, (failure as { message?: string }).message)
    }

    if (result === null) throw new Error('The answer stream ended early.')

    return result
  }

  /** Confirm or cancel a proposed action. The server checks and runs it on "confirm". */
  async decide(id: number, decision: 'confirm' | 'reject'): Promise<void> {
    if (this.state.deciding[id]) return

    this.store.set((state) => ({
      ...state,
      deciding: { ...state.deciding, [id]: decision },
      error: null,
    }))

    try {
      const response = await this.request<{ messages: AiMessageSchema[] }>(this.url(decision, id), {
        method: 'POST',
      })

      this.store.set((state) => {
        const updated = new Map(response.messages.map((item) => [item.id, item]))
        const known = new Set(state.messages.map((item) => item.id))

        return {
          ...state,
          deciding: omit(state.deciding, id),
          messages: [
            ...state.messages.map((item) => updated.get(item.id) ?? item),
            ...response.messages.filter((item) => !known.has(item.id)),
          ],
        }
      })
    } catch (error) {
      this.store.set((state) => ({ ...state, deciding: omit(state.deciding, id) }))
      this.fail(error)
    }
  }

  /** Tokens (and cost) of the conversation's answers so far. */
  totals(messages: AiMessageSchema[] = this.state.messages): CopilotTotals | null {
    let inputTokens = 0
    let outputTokens = 0
    let cost: number | undefined

    for (const message of messages) {
      if (!message.usage) continue

      inputTokens += message.usage.inputTokens
      outputTokens += message.usage.outputTokens

      if (message.usage.cost !== undefined) cost = (cost ?? 0) + message.usage.cost
    }

    if (inputTokens + outputTokens === 0) return null

    return cost === undefined ? { inputTokens, outputTokens } : { inputTokens, outputTokens, cost }
  }

  // ---------------------------------------------------------------- Helpers

  private url(endpoint: 'conversation' | 'confirm' | 'reject' | 'delete', id: number): string {
    return this.schema.endpoints[endpoint].replace(
      this.schema.placeholder,
      encodeURIComponent(String(id)),
    )
  }

  private fail(error: unknown): void {
    const data = error instanceof HttpError ? (error.data as { message?: unknown } | null) : null
    const message =
      error instanceof HttpError &&
      error.status < 500 &&
      typeof data?.message === 'string' &&
      data.message !== ''
        ? data.message
        : undefined

    this.store.update({ loading: false, error: message === undefined ? {} : { message } })
  }

  private storage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
    if (this.options.storage !== undefined) return this.options.storage

    try {
      return typeof window === 'undefined' ? null : window.sessionStorage
    } catch {
      return null
    }
  }

  private remember(id: number): void {
    try {
      this.storage()?.setItem(this.storageKey, String(id))
    } catch {
      // Storage can be blocked; remembering is a convenience only.
    }
  }

  private forget(): void {
    try {
      this.storage()?.removeItem(this.storageKey)
    } catch {
      // See remember().
    }
  }

  private rememberedConversation(): number | null {
    try {
      const value = Number(this.storage()?.getItem(this.storageKey) ?? '')

      return Number.isInteger(value) && value > 0 ? value : null
    } catch {
      return null
    }
  }
}

function omit<T>(record: Record<number, T>, key: number): Record<number, T> {
  const next = { ...record }
  delete next[key]

  return next
}

function currentUrl(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.location.href
}

/**
 * Plain text of a message, split into paragraphs and list items for display. Messages
 * are never rendered as HTML: model answers are untrusted.
 */
export function copilotBlocks(
  content: string,
): Array<{ type: 'p' | 'ul' | 'ol'; lines: string[] }> {
  const blocks: Array<{ type: 'p' | 'ul' | 'ol'; lines: string[] }> = []

  for (const raw of content.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd()
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line)
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    const type = bullet ? 'ul' : numbered ? 'ol' : 'p'
    const text = (bullet?.[1] ?? numbered?.[1] ?? line).replace(/\*\*(.+?)\*\*/g, '$1')
    const last = blocks.at(-1)

    if (line.trim() === '') {
      if (last && last.type === 'p') blocks.push({ type: 'p', lines: [] })

      continue
    }

    if (last && last.type === type && (type !== 'p' || last.lines.length > 0)) {
      last.lines.push(text)
    } else if (last && last.type === 'p' && type === 'p' && last.lines.length === 0) {
      last.lines.push(text)
    } else {
      blocks.push({ type, lines: [text] })
    }
  }

  return blocks.filter((block) => block.lines.length > 0)
}
