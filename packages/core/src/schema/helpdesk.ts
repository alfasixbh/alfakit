import type { ActionSchema } from './actions'
import type { PresenceSchema } from './realtime'

/**
 * alfasix/alfakit-helpdesk: the agent inbox (`Inbox` page, schema component
 * `helpdesk:inbox`) and the live chat widget's payloads (`GET /support/chat`).
 */

/** A status, priority or SLA state with its label and colour. */
export interface HelpdeskBadge {
  value: string
  label: string
  color: string
}

/** An SLA target: `on_track`, `due_soon`, `breached`, `paused`, `met`, `missed` or `none`. */
export interface HelpdeskSla {
  state: string
  label: string
  color: string
  /** ISO 8601. */
  dueAt?: string
}

export interface HelpdeskView {
  key: string
  label: string
  icon: string
  color?: string
  count?: number
}

/** A row of the inbox list. */
export interface HelpdeskTicketSummary {
  key: string
  reference: string
  subject: string
  requester: string
  /** Plain text of the last message. */
  excerpt?: string
  excerptInternal?: true
  /** The requester wrote last. */
  awaitingReply?: true
  status: HelpdeskBadge
  priority: HelpdeskBadge
  sla: HelpdeskSla
  assignee?: string
  channel: string
  channelIcon: string
  lastActivityAt?: string
}

export interface HelpdeskInboxList {
  view: string
  search?: string
  page: number
  hasMore?: true
  views: HelpdeskView[]
  tickets: HelpdeskTicketSummary[]
}

export interface HelpdeskAttachment {
  name: string
  size?: number | null
  mime?: string | null
  /** Short-lived signed download URL. */
  url?: string | null
}

/** A message of the conversation; `html` is sanitised on the server. */
export interface HelpdeskMessage {
  key: string
  kind: 'reply' | 'note' | 'event'
  fromRequester?: true
  author: { name: string; avatar?: string }
  html: string
  source?: string
  createdAt?: string
  attachments?: HelpdeskAttachment[]
}

/** The ticket of the reading pane. */
export interface HelpdeskTicket {
  key: string
  reference: string
  subject: string
  url?: string
  status: HelpdeskBadge
  priority: HelpdeskBadge
  type: { value: string; label: string }
  channel: { value: string; label: string; icon: string }
  requester: { name: string; email?: string }
  assignee?: { key: string; name: string; avatar?: string | null }
  group?: { key: string; name: string }
  tags?: string[]
  sla: {
    summary: HelpdeskSla
    firstResponse?: HelpdeskSla
    resolution?: HelpdeskSla
    policy?: string
  }
  satisfaction?: { rating?: number; comment?: string }
  merged?: true
  createdAt?: string
  messages: HelpdeskMessage[]
  /** The requester is typing (live chat). */
  typing?: true
  /** The ticket's actions (reply, note, assign…) for `ActionList`, with its record. */
  actions: ActionSchema[]
  canReply?: true
  /** With `Panel::realtime()`: who else is on this ticket. */
  presence?: PresenceSchema
}

/** Schema component `helpdesk:inbox`. */
export interface HelpdeskInboxSchema {
  type: 'helpdesk:inbox'
  key: string
  /** The action context of every request (`helpdesk`). */
  actionComponent: string
  /** Parameters travel under this argument: `{helpdesk: {view, search, page…}}`. */
  argumentsKey: string
  listAction: string
  ticketAction: string
  typingAction: string
  replyAction: string
  view: string
  list: HelpdeskInboxList
  /** `?ticket=` of the page URL. */
  selected?: string
  /** Private channels of the ticket model (empty without `Panel::realtime()`). */
  live: { channels: string[]; debounce?: number }
  /** Polling without real-time updates (`'20s'`). */
  pollingInterval?: string
  ticketsUrl?: string
}

/** Echo event of a ticket's activity (`TicketActivity::broadcastAs()`). */
export interface HelpdeskActivity {
  ticket: string | number
  kind: 'message' | 'typing' | 'updated'
  actor: 'agent' | 'requester' | 'system'
  by?: string | number | null
  at?: number
}

// ---------------------------------------------------------------- Live chat

export interface HelpdeskChatMessage {
  key: string
  from: 'visitor' | 'agent'
  name: string
  html: string
  createdAt?: string | null
}

export interface HelpdeskChatConversation {
  key: string | null
  status: string
  closed?: true | null
  messages: HelpdeskChatMessage[]
  /** The name of the agent typing, if one is. */
  agentTyping?: string | null
}

export interface HelpdeskChatConfig {
  enabled: boolean
  greeting: string
  /** Seconds between polls while the chat is open. */
  pollingInterval: number
  requireEmail: boolean
  /** Ask guests for a name and email (signed-in customers are known). */
  askContact: boolean
  maxLength: number
  /** Name of the honeypot input. */
  honeypot: string
  contactUrl?: string | null
  /** "Powered by AlfaKit · Alfa Six" as HTML when `HelpdeskPlugin::poweredBy()` is on (off by default). */
  poweredBy?: string | null
  /** The widget's texts, translated on the server (`alfakit-helpdesk::helpdesk.chat`). */
  strings: Record<string, string>
}

export interface HelpdeskChatResponse {
  config?: HelpdeskChatConfig
  conversation: HelpdeskChatConversation | null
}
