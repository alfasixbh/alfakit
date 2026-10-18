import type { ActionRunner } from './actions'
import { HttpError, requestJson } from './http'
import type { Translator } from './i18n'
import { PollScheduler } from './poll'
import { acquireChannel, RECORD_CHANGED_EVENT, withEcho, type EchoLike } from './realtime'
import type { ActionSchema } from './schema/actions'
import type {
  HelpdeskActivity,
  HelpdeskChatConfig,
  HelpdeskChatConversation,
  HelpdeskChatResponse,
  HelpdeskInboxList,
  HelpdeskInboxSchema,
  HelpdeskTicket,
  HelpdeskTicketSummary,
} from './schema/helpdesk'
import { shortcuts as defaultShortcuts, type ShortcutRegistry } from './shortcuts'
import { createStore, type Store } from './store'

/**
 * alfasix/alfakit-helpdesk in the browser: the agent inbox's state (views, list, the open
 * ticket, the quick composer, live updates and keyboard shortcuts) and the live chat
 * widget's client. Everything is fetched from the server, which authorises every request;
 * broadcasts only carry keys, so a change makes the inbox fetch again.
 */

/** Echo event of `TicketActivity` (`broadcastAs()` is `helpdesk.activity`). */
export const HELPDESK_ACTIVITY_EVENT = '.helpdesk.activity'

/** How long a typing ping shows "… is typing". */
export const HELPDESK_TYPING_MS = 6000

/** Ids of the inbox's keyboard shortcuts (customisable in the shortcuts overlay). */
export const HELPDESK_SHORTCUTS = {
  next: 'helpdesk.next',
  previous: 'helpdesk.previous',
  reply: 'helpdesk.reply',
  note: 'helpdesk.note',
  search: 'helpdesk.search',
} as const

export type HelpdeskComposerMode = 'reply' | 'note'

export interface HelpdeskInboxState {
  view: string
  search: string
  list: HelpdeskInboxList
  loadingList: boolean
  selected: string | null
  ticket: HelpdeskTicket | null
  loadingTicket: boolean
  ticketError: boolean
  /** The requester is typing on the open ticket. */
  requesterTyping: boolean
  composer: { mode: HelpdeskComposerMode; text: string; sending: boolean; error: string | null }
  /** Listening over Echo (false: polling). */
  live: boolean
  /** For a polite live region. */
  announcement: string
}

export interface HelpdeskInboxEnvironment {
  runner: Pick<ActionRunner, 'executeJson'>
  token: string
  t: Translator['t']
  /** Keep `?view=` and `?ticket=` in the address bar (default: `history.replaceState`). */
  replaceUrl?: (url: string) => void
}

type ListResult = { list: HelpdeskInboxList }
type TicketResult = { ticket: HelpdeskTicket }

function action(name: string): ActionSchema {
  return { type: 'Action', name, hasAction: true }
}

/** The activity payload of a broadcast, or null. */
export function asHelpdeskActivity(payload: Record<string, unknown>): HelpdeskActivity | null {
  const { ticket, kind, actor } = payload

  if ((typeof ticket !== 'string' && typeof ticket !== 'number') || typeof kind !== 'string') {
    return null
  }

  if (kind !== 'message' && kind !== 'typing' && kind !== 'updated') return null

  return {
    ticket,
    kind,
    actor: actor === 'agent' || actor === 'requester' ? actor : 'system',
    by: typeof payload.by === 'string' || typeof payload.by === 'number' ? payload.by : null,
    at: typeof payload.at === 'number' ? payload.at : Date.now(),
  }
}

/**
 * The inbox: one controller per mounted component. Renderers show `store` and call the
 * methods; `start()` connects live updates (or polling) and returns the cleanup.
 */
export class HelpdeskInboxController {
  readonly store: Store<HelpdeskInboxState>

  private schema: HelpdeskInboxSchema
  private listRequest = 0
  private ticketRequest = 0
  private searchTimer: ReturnType<typeof setTimeout> | null = null
  private refreshTimer: ReturnType<typeof setTimeout> | null = null
  private typingTimer: ReturnType<typeof setTimeout> | null = null
  private lastTypingPing = 0

  constructor(
    schema: HelpdeskInboxSchema,
    private env: HelpdeskInboxEnvironment,
  ) {
    this.schema = schema
    const selected = schema.selected ?? null

    this.store = createStore<HelpdeskInboxState>({
      view: schema.view,
      search: schema.list.search ?? '',
      list: schema.list,
      loadingList: false,
      selected,
      ticket: null,
      loadingTicket: selected !== null,
      ticketError: false,
      requesterTyping: false,
      composer: { mode: 'reply', text: '', sending: false, error: null },
      live: false,
      announcement: '',
    })
  }

  get state(): HelpdeskInboxState {
    return this.store.get()
  }

  get tickets(): HelpdeskTicketSummary[] {
    return this.state.list.tickets
  }

  setEnvironment(env: HelpdeskInboxEnvironment): void {
    this.env = env
  }

  /**
   * The page was reloaded (after a modal action such as Reply or Assign): fetch the list
   * and the open ticket again, keeping the view, search and selection.
   */
  setSchema(schema: HelpdeskInboxSchema): void {
    this.schema = schema
    void this.refreshList()
    void this.refreshTicket()
  }

  // ------------------------------------------------------------- List

  setView(view: string): void {
    if (view === this.state.view) return

    this.store.update({
      view,
      list: { ...this.state.list, tickets: [], page: 1, hasMore: undefined },
    })
    this.syncUrl()
    void this.refreshList()
  }

  setSearch(search: string, delay = 300): void {
    this.store.update({ search })

    if (this.searchTimer !== null) clearTimeout(this.searchTimer)

    this.searchTimer = setTimeout(() => {
      this.searchTimer = null
      void this.refreshList()
    }, delay)
  }

  /** Fetch the first page of the view again. */
  async refreshList(): Promise<void> {
    await this.fetchList(1, false)
  }

  async loadMore(): Promise<void> {
    if (!this.state.list.hasMore || this.state.loadingList) return

    await this.fetchList(this.state.list.page + 1, true)
  }

  private async fetchList(page: number, append: boolean): Promise<void> {
    const id = ++this.listRequest
    const { view, search } = this.state

    this.store.update({ loadingList: true })

    try {
      const result = await this.env.runner.executeJson<ListResult>(action(this.schema.listAction), {
        token: this.env.token,
        component: this.schema.actionComponent,
        arguments: { [this.schema.argumentsKey]: { view, search, page } },
      })

      if (id !== this.listRequest || !result?.list) return

      const tickets = append
        ? [...this.state.list.tickets, ...result.list.tickets]
        : result.list.tickets

      this.store.update({ list: { ...result.list, tickets }, loadingList: false })
    } catch {
      if (id === this.listRequest) this.store.update({ loadingList: false })
    }
  }

  // ------------------------------------------------------------- Selection

  async select(key: string | null): Promise<void> {
    if (key === this.state.selected && this.state.ticket) return

    this.store.update({
      selected: key,
      ticket: key === null ? null : this.state.ticket?.key === key ? this.state.ticket : null,
      ticketError: false,
      requesterTyping: false,
      composer: { ...this.state.composer, text: '', error: null },
    })
    this.syncUrl()

    if (key !== null) await this.refreshTicket()
  }

  /** Move the selection down (`1`) or up (`-1`) the list. Returns the new key. */
  move(offset: 1 | -1): string | null {
    const keys = this.tickets.map((ticket) => ticket.key)

    if (keys.length === 0) return null

    const index = this.state.selected === null ? -1 : keys.indexOf(this.state.selected)
    const next =
      index === -1
        ? offset === 1
          ? 0
          : keys.length - 1
        : Math.min(keys.length - 1, Math.max(0, index + offset))
    const key = keys[next] ?? null

    if (key !== null && key !== this.state.selected) void this.select(key)

    return key
  }

  async refreshTicket(): Promise<void> {
    const key = this.state.selected

    if (key === null) return

    const id = ++this.ticketRequest

    this.store.update({ loadingTicket: this.state.ticket === null })

    try {
      const result = await this.env.runner.executeJson<TicketResult>(
        action(this.schema.ticketAction),
        {
          token: this.env.token,
          component: this.schema.actionComponent,
          record: key,
        },
      )

      if (id !== this.ticketRequest || key !== this.state.selected || !result?.ticket) return

      this.store.update({
        ticket: result.ticket,
        loadingTicket: false,
        ticketError: false,
        requesterTyping: this.state.requesterTyping || Boolean(result.ticket.typing),
      })
    } catch {
      if (id === this.ticketRequest) this.store.update({ loadingTicket: false, ticketError: true })
    }
  }

  // ------------------------------------------------------------- Composer

  setMode(mode: HelpdeskComposerMode): void {
    this.store.update({ composer: { ...this.state.composer, mode } })
  }

  setText(text: string): void {
    this.store.update({ composer: { ...this.state.composer, text, error: null } })

    if (text.trim() !== '' && this.state.composer.mode === 'reply') this.typing()
  }

  /**
   * Send the composer's text as a reply (or an internal note), optionally changing the
   * status in the same request. Returns whether it was sent.
   */
  async send(options: { status?: string } = {}): Promise<boolean> {
    const { selected, composer } = this.state

    if (selected === null || composer.sending || composer.text.trim() === '') return false

    this.store.update({ composer: { ...composer, sending: true, error: null } })

    try {
      const result = await this.env.runner.executeJson<TicketResult>(
        action(this.schema.replyAction),
        {
          token: this.env.token,
          component: this.schema.actionComponent,
          record: selected,
          arguments: {
            [this.schema.argumentsKey]: {
              text: composer.text,
              internal: composer.mode === 'note',
              ...(options.status ? { status: options.status } : {}),
            },
          },
        },
      )

      this.store.update({
        ticket:
          result?.ticket && selected === this.state.selected ? result.ticket : this.state.ticket,
        composer: { mode: composer.mode, text: '', sending: false, error: null },
        announcement:
          composer.mode === 'note'
            ? this.env.t('helpdesk.add_note', {}, 'Add note')
            : this.env.t('helpdesk.send', {}, 'Send'),
      })
      void this.refreshList()

      return true
    } catch (error) {
      const message =
        error instanceof HttpError && error.status === 422
          ? (error.errors[this.schema.argumentsKey]?.[0] ?? null)
          : null

      this.store.update({
        composer: {
          ...this.state.composer,
          sending: false,
          error:
            message ?? this.env.t('helpdesk.send_failed', {}, 'The message could not be sent.'),
        },
      })

      return false
    }
  }

  /** Tell the server an agent is typing (at most every 3 seconds). */
  typing(now: number = Date.now()): void {
    const key = this.state.selected

    if (key === null || now - this.lastTypingPing < 3000) return

    this.lastTypingPing = now

    void this.env.runner
      .executeJson(action(this.schema.typingAction), {
        token: this.env.token,
        component: this.schema.actionComponent,
        record: key,
      })
      .catch(() => {})
  }

  // ------------------------------------------------------------- Live updates

  /**
   * Follow the ticket model's channels (`Panel::realtime()`) or poll at `pollingInterval`
   * without them. Returns the cleanup.
   */
  start(options: { echo?: EchoLike | null; scheduler?: PollScheduler } = {}): () => void {
    const poll = () => {
      if (!this.schema.pollingInterval) return

      const scheduler = options.scheduler ?? new PollScheduler(() => this.refreshAll())

      return scheduler.subscribe(this.schema.actionComponent, this.schema.pollingInterval)
    }

    if (this.schema.selected && !this.state.ticket) void this.refreshTicket()

    if (this.schema.live.channels.length === 0) {
      const stop = poll()

      return () => {
        stop?.()
        this.destroy()
      }
    }

    const stop = withEcho(
      (echo) => {
        this.store.update({ live: true })

        const releases = this.schema.live.channels.map((name) => {
          const acquired = acquireChannel(echo, 'private', name)

          if (!acquired) return () => {}

          const onRecord = (payload: Record<string, unknown>) => {
            const key = payload.key

            this.onActivity({
              ticket: typeof key === 'number' || typeof key === 'string' ? key : '',
              kind: 'updated',
              actor: 'system',
            })
          }
          const onActivity = (payload: Record<string, unknown>) => {
            const activity = asHelpdeskActivity(payload)

            if (activity) this.onActivity(activity)
          }

          acquired.channel.listen?.(RECORD_CHANGED_EVENT, onRecord)
          acquired.channel.listen?.(HELPDESK_ACTIVITY_EVENT, onActivity)

          return () => {
            acquired.channel.stopListening?.(RECORD_CHANGED_EVENT, onRecord)
            acquired.channel.stopListening?.(HELPDESK_ACTIVITY_EVENT, onActivity)
            acquired.release()
          }
        })

        return () => releases.forEach((release) => release())
      },
      { echo: options.echo, onUnavailable: poll },
    )

    return () => {
      stop()
      this.store.update({ live: false })
      this.destroy()
    }
  }

  /** A broadcast arrived: refetch (debounced) what it concerns. */
  onActivity(activity: HelpdeskActivity): void {
    const isOpen = this.state.selected !== null && String(activity.ticket) === this.state.selected

    if (activity.kind === 'typing') {
      if (isOpen && activity.actor === 'requester') this.showRequesterTyping()

      return
    }

    if (isOpen && activity.kind === 'message' && activity.actor === 'requester') {
      this.store.update({
        requesterTyping: false,
        announcement: this.env.t('helpdesk.new_activity', {}, 'New activity'),
      })
    }

    this.scheduleRefresh(isOpen)
  }

  private showRequesterTyping(): void {
    this.store.update({ requesterTyping: true })

    if (this.typingTimer !== null) clearTimeout(this.typingTimer)

    this.typingTimer = setTimeout(() => {
      this.typingTimer = null
      this.store.update({ requesterTyping: false })
    }, HELPDESK_TYPING_MS)
  }

  private pendingTicketRefresh = false

  private scheduleRefresh(ticket: boolean): void {
    this.pendingTicketRefresh ||= ticket

    if (this.refreshTimer !== null) clearTimeout(this.refreshTimer)

    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null
      const refreshTicket = this.pendingTicketRefresh
      this.pendingTicketRefresh = false

      void this.refreshList()
      if (refreshTicket) void this.refreshTicket()
    }, this.schema.live.debounce ?? 400)
  }

  async refreshAll(): Promise<void> {
    await Promise.all([this.refreshList(), this.refreshTicket()])
  }

  // ------------------------------------------------------------- Shortcuts

  /**
   * Register `j` / `k` (next / previous ticket), `r` (reply), `n` (internal note) and `/`
   * (search) in the shortcuts registry; the handlers move the focus in the renderer.
   */
  registerShortcuts(
    handlers: {
      focusComposer: () => void
      focusSearch: () => void
      focusTicket?: (key: string) => void
    },
    registry: Pick<ShortcutRegistry, 'register'> = defaultShortcuts,
  ): () => void {
    const t = this.env.t
    const move = (offset: 1 | -1) => {
      const key = this.move(offset)

      if (key !== null) handlers.focusTicket?.(key)

      return key !== null
    }
    const compose = (mode: HelpdeskComposerMode) => {
      if (!this.state.ticket?.canReply) return false

      this.setMode(mode)
      handlers.focusComposer()

      return true
    }

    const stops = [
      registry.register({
        id: HELPDESK_SHORTCUTS.next,
        keys: ['j'],
        group: 'navigation',
        label: t('helpdesk.shortcut_next', {}, 'Next ticket'),
        handler: () => move(1),
      }),
      registry.register({
        id: HELPDESK_SHORTCUTS.previous,
        keys: ['k'],
        group: 'navigation',
        label: t('helpdesk.shortcut_previous', {}, 'Previous ticket'),
        handler: () => move(-1),
      }),
      registry.register({
        id: HELPDESK_SHORTCUTS.reply,
        keys: ['r'],
        group: 'actions',
        label: t('helpdesk.shortcut_reply', {}, 'Reply to the ticket'),
        handler: () => compose('reply'),
      }),
      registry.register({
        id: HELPDESK_SHORTCUTS.note,
        keys: ['n'],
        group: 'actions',
        label: t('helpdesk.shortcut_note', {}, 'Add an internal note'),
        handler: () => compose('note'),
      }),
      registry.register({
        id: HELPDESK_SHORTCUTS.search,
        keys: ['/'],
        group: 'navigation',
        label: t('helpdesk.shortcut_search', {}, 'Search tickets'),
        handler: () => {
          handlers.focusSearch()

          return true
        },
      }),
    ]

    return () => stops.forEach((stop) => stop())
  }

  // ------------------------------------------------------------- Internals

  private syncUrl(): void {
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)
    const { view, selected } = this.state

    url.searchParams.set('view', view)

    if (selected === null) url.searchParams.delete('ticket')
    else url.searchParams.set('ticket', selected)

    const target = url.pathname + url.search + url.hash

    if (this.env.replaceUrl) {
      this.env.replaceUrl(target)
    } else {
      window.history.replaceState(window.history.state, '', target)
    }
  }

  destroy(): void {
    for (const timer of [this.searchTimer, this.refreshTimer, this.typingTimer]) {
      if (timer !== null) clearTimeout(timer)
    }

    this.searchTimer = null
    this.refreshTimer = null
    this.typingTimer = null
  }
}

/** The tone of an SLA badge: `danger` when breached… (`gray` when there is no target). */
export function helpdeskSlaTone(state: string): 'danger' | 'warning' | 'success' | 'gray' {
  switch (state) {
    case 'breached':
    case 'missed':
      return 'danger'
    case 'due_soon':
      return 'warning'
    case 'on_track':
    case 'met':
      return 'success'
    default:
      return 'gray'
  }
}

/** A file size for attachment links, with the formatter's number format. */
export function helpdeskFileSize(
  bytes: number | null | undefined,
  format: (value: number) => string,
): string | null {
  if (bytes === null || bytes === undefined || bytes < 0) return null

  if (bytes < 1024) return `${format(bytes)} B`
  if (bytes < 1024 * 1024) return `${format(Math.round(bytes / 102.4) / 10)} KB`

  return `${format(Math.round(bytes / (1024 * 102.4)) / 10)} MB`
}

// ---------------------------------------------------------------- Live chat widget

export interface HelpdeskChatState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  open: boolean
  config: HelpdeskChatConfig | null
  conversation: HelpdeskChatConversation | null
  draft: string
  name: string
  email: string
  /** The honeypot input's value (people never fill it). */
  trap: string
  sending: boolean
  error: string | null
  /** Agent messages that arrived while the widget was closed. */
  unread: number
}

export interface HelpdeskChatOptions {
  /** The chat endpoint (`/support/chat` by default). */
  endpoint?: string
  /** Keep polling while the widget is closed (unread badge); default true. */
  pollWhenClosed?: boolean
  request?: typeof requestJson
}

/** The text of a widget string: `config.strings[key]` with `:name` replacements. */
export function helpdeskChatString(
  config: HelpdeskChatConfig | null,
  key: string,
  fallback: string,
  replacements: Record<string, string> = {},
): string {
  const template = config?.strings[key] ?? fallback

  return Object.entries(replacements).reduce(
    (text, [name, value]) => text.replace(new RegExp(`:${name}\\b`, 'g'), value),
    template,
  )
}

/**
 * The live chat widget's client: loads the visitor's chat, starts it, sends messages and
 * typing pings, and polls while the widget is open (slower, for the unread badge, while
 * it is closed). The visitor's identity is an HTTP-only cookie the server sets.
 */
export class HelpdeskChatClient {
  readonly store: Store<HelpdeskChatState> = createStore<HelpdeskChatState>({
    status: 'idle',
    open: false,
    config: null,
    conversation: null,
    draft: '',
    name: '',
    email: '',
    trap: '',
    sending: false,
    error: null,
    unread: 0,
  })

  private readonly endpoint: string
  private readonly request: typeof requestJson
  private timer: ReturnType<typeof setTimeout> | null = null
  private lastTypingPing = 0
  private stopped = false

  constructor(private readonly options: HelpdeskChatOptions = {}) {
    this.endpoint = (options.endpoint ?? '/support/chat').replace(/\/$/, '')
    this.request = options.request ?? requestJson
  }

  get state(): HelpdeskChatState {
    return this.store.get()
  }

  t(key: string, fallback: string, replacements: Record<string, string> = {}): string {
    return helpdeskChatString(this.state.config, key, fallback, replacements)
  }

  async load(): Promise<void> {
    if (this.state.status === 'loading') return

    this.store.update({ status: this.state.config ? 'ready' : 'loading' })

    try {
      const result = await this.request<HelpdeskChatResponse>(this.endpoint)

      this.receive(result.conversation, result.config)
      this.store.update({ status: 'ready' })
    } catch {
      this.store.update({ status: this.state.config ? 'ready' : 'error' })
    }

    this.schedule()
  }

  setOpen(open: boolean): void {
    this.store.update({ open, ...(open ? { unread: 0 } : {}) })

    if (open && this.state.status === 'idle') void this.load()
    else this.schedule()
  }

  setDraft(draft: string): void {
    this.store.update({ draft, error: null })

    if (draft.trim() !== '' && this.state.conversation?.key) this.typing()
  }

  setContact(contact: { name?: string; email?: string; trap?: string }): void {
    this.store.update(contact)
  }

  /** Send the draft: the first message starts the chat. Returns whether it was sent. */
  async send(): Promise<boolean> {
    const { draft, sending, conversation, config } = this.state
    const message = draft.trim()

    if (message === '' || sending) return false

    if (config && message.length > config.maxLength) {
      this.store.update({ error: this.t('failed', 'The message could not be sent. Try again.') })

      return false
    }

    const starting = !conversation?.key || Boolean(conversation.closed)

    this.store.update({ sending: true, error: null })

    try {
      const result = await this.request<{ conversation: HelpdeskChatConversation }>(
        starting ? this.endpoint : `${this.endpoint}/messages`,
        {
          method: 'POST',
          body: starting
            ? {
                message,
                name: this.state.name || undefined,
                email: this.state.email || undefined,
                [config?.honeypot ?? '_website']: this.state.trap || undefined,
              }
            : { message },
        },
      )

      this.receive(result.conversation)
      this.store.update({ draft: '', sending: false })
      this.schedule()

      return true
    } catch (error) {
      const text =
        error instanceof HttpError && error.status === 429
          ? this.t('rate_limited', 'Too many messages. Please wait a moment.')
          : error instanceof HttpError && error.status === 422
            ? (Object.values(error.errors)[0]?.[0] ??
              this.t('failed', 'The message could not be sent. Try again.'))
            : this.t('failed', 'The message could not be sent. Try again.')

      this.store.update({ sending: false, error: text })

      return false
    }
  }

  /** Start over after a chat ended (the old ticket stays). */
  async startNew(): Promise<void> {
    try {
      await this.request(this.endpoint, { method: 'DELETE' })
    } catch {
      // The cookie is cleared server side; a failure leaves the old chat shown.
    }

    this.store.update({ conversation: null, draft: '' })
  }

  typing(now: number = Date.now()): void {
    if (now - this.lastTypingPing < 3000) return

    this.lastTypingPing = now

    void this.request(`${this.endpoint}/typing`, { method: 'POST', body: {} }).catch(() => {})
  }

  /** Stop polling (unmount). */
  stop(): void {
    this.stopped = true

    if (this.timer !== null) clearTimeout(this.timer)

    this.timer = null
  }

  private receive(
    conversation: HelpdeskChatConversation | null,
    config?: HelpdeskChatConfig,
  ): void {
    const previous = this.state.conversation
    const before = new Set((previous?.messages ?? []).map((message) => message.key))
    const fresh = (conversation?.messages ?? []).filter(
      (message) => message.from === 'agent' && !before.has(message.key),
    )

    this.store.update({
      conversation,
      ...(config ? { config } : {}),
      unread: this.state.open || previous === null ? 0 : this.state.unread + fresh.length,
    })
  }

  private schedule(): void {
    if (this.timer !== null) clearTimeout(this.timer)

    this.timer = null

    const { config, conversation, open } = this.state

    if (
      this.stopped ||
      typeof window === 'undefined' ||
      !config ||
      !conversation?.key ||
      conversation.closed
    )
      return
    if (!open && this.options.pollWhenClosed === false) return

    const seconds = open ? config.pollingInterval : Math.max(config.pollingInterval * 5, 20)

    this.timer = setTimeout(() => {
      this.timer = null

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        this.schedule()

        return
      }

      void this.poll()
    }, seconds * 1000)
  }

  private async poll(): Promise<void> {
    try {
      const result = await this.request<HelpdeskChatResponse>(this.endpoint)

      this.receive(result.conversation)
    } catch {
      // Try again on the next tick.
    }

    this.schedule()
  }
}
