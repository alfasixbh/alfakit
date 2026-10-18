import type { BaseComponent } from './components'

/**
 * The copilot of alfasix/alfakit-ai (`AiPlugin::copilot()`): a topbar button and a chat
 * slide-over, rendered by the `ai:copilot` registry component. Everything it shows comes
 * from the copilot endpoints; the model's tools run on the server with the user's
 * permissions, and proposed actions only run when the user confirms them.
 */
export interface AiCopilotSchema extends BaseComponent {
  type: 'ai:copilot'
  endpoints: {
    conversations: string
    /** Contains `placeholder` where the conversation id goes. */
    conversation: string
    send: string
    /** `AiPlugin::streaming()`: `send` as server-sent events (answers arrive as written). */
    stream?: string | null
    /** Contain `placeholder` where the message id goes. */
    confirm: string
    reject: string
    delete: string
  }
  placeholder: string
  /** Shortcuts that open the copilot (`mod+j`). */
  keyBindings?: string[]
  /** Set when the plugin has prices: usage costs are in this currency. */
  currency?: string
  canUse?: boolean
  /**
   * Set when no provider key is configured: `info` when the copilot answers with sample
   * answers (`AiPlugin::demoResponses()`), `warning` when AI is unavailable. Translated on
   * the server; the setup command is only in it for users allowed to see it.
   */
  notice?: AiSetupNoticeSchema
}

export interface AiSetupNoticeSchema {
  status: 'info' | 'warning'
  heading: string
  description?: string
}

export type AiMessageRole = 'user' | 'assistant' | 'action' | 'navigation' | 'error'

export type AiActionStatus = 'pending' | 'confirmed' | 'rejected' | 'failed'

/** A panel action the model proposed; it runs only when the user confirms it. */
export interface AiProposedActionSchema {
  label?: string
  record?: string
  status: AiActionStatus
  inputs?: Array<{ label: string; value: unknown }>
  color?: string
  error?: string
}

export interface AiMessageSchema {
  id: number
  role: AiMessageRole
  content: string
  createdAt?: string
  /** What the tools did while answering ("Searched “acme”"). */
  activity?: Array<{ tool: string; label: string }>
  /** A panel page (navigation messages, the record of an action). */
  url?: string
  action?: AiProposedActionSchema
  usage?: { inputTokens: number; outputTokens: number; cost?: number }
  /** A sample answer made without AI (`AiPlugin::demoResponses()`): shown with a label. */
  demo?: boolean
}

export interface AiConversationSchema {
  id: number
  title: string
  updatedAt?: string
}

/**
 * Streams an answer into a modal form (`AiPlugin::streaming()`): `AiAction` text answers
 * and `aiAssist()` suggestions. Its state is the one-time token the server issued; the
 * finished answer goes into `target`, a failure into `errorPath` (absolute state paths).
 */
export interface AiStreamSchema extends BaseComponent {
  type: 'ai:stream'
  statePath: string
  endpoint: string
  target: string
  errorPath: string
}
