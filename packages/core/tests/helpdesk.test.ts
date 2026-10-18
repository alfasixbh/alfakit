import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  HELPDESK_ACTIVITY_EVENT,
  HELPDESK_SHORTCUTS,
  HelpdeskChatClient,
  HelpdeskInboxController,
  asHelpdeskActivity,
  helpdeskChatString,
  helpdeskFileSize,
  helpdeskSlaTone,
} from '../src/helpdesk'
import { HttpError } from '../src/http'
import type { EchoLike } from '../src/realtime'
import { RECORD_CHANGED_EVENT, resetRealtime } from '../src/realtime'
import type {
  HelpdeskChatConfig,
  HelpdeskInboxSchema,
  HelpdeskTicket,
  HelpdeskTicketSummary,
} from '../src/schema/helpdesk'
import { ShortcutRegistry } from '../src/shortcuts'

const summary = (key: string): HelpdeskTicketSummary => ({
  key,
  reference: `#${key}`,
  subject: `Ticket ${key}`,
  requester: 'Casey',
  status: { value: 'open', label: 'Open', color: 'danger' },
  priority: { value: 'normal', label: 'Normal', color: 'info' },
  sla: { state: 'on_track', label: 'On track', color: 'success' },
  channel: 'portal',
  channelIcon: 'layout-panel-top',
})

const ticket = (key: string, extra: Partial<HelpdeskTicket> = {}): HelpdeskTicket => ({
  key,
  reference: `#${key}`,
  subject: `Ticket ${key}`,
  status: { value: 'open', label: 'Open', color: 'danger' },
  priority: { value: 'normal', label: 'Normal', color: 'info' },
  type: { value: 'question', label: 'Question' },
  channel: { value: 'portal', label: 'Portal', icon: 'layout-panel-top' },
  requester: { name: 'Casey' },
  sla: { summary: { state: 'on_track', label: 'On track', color: 'success' } },
  messages: [],
  actions: [],
  canReply: true,
  ...extra,
})

const schema = (extra: Partial<HelpdeskInboxSchema> = {}): HelpdeskInboxSchema => ({
  type: 'helpdesk:inbox',
  key: 'helpdesk-inbox',
  actionComponent: 'helpdesk',
  argumentsKey: 'helpdesk',
  listAction: 'helpdeskList',
  ticketAction: 'helpdeskTicket',
  typingAction: 'helpdeskTyping',
  replyAction: 'helpdeskQuickReply',
  view: 'mine',
  list: { view: 'mine', page: 1, views: [], tickets: [summary('1'), summary('2'), summary('3')] },
  live: { channels: [], debounce: 0 },
  ...extra,
})

function environment(executeJson = vi.fn()) {
  executeJson.mockImplementation(async (action: { name: string }, context: { record?: string }) => {
    if (action.name === 'helpdeskTicket') return { ticket: ticket(String(context.record)) }
    if (action.name === 'helpdeskList') return { list: schema().list }
    if (action.name === 'helpdeskQuickReply')
      return {
        ticket: ticket(String(context.record), {
          status: { value: 'pending', label: 'Pending', color: 'warning' },
        }),
      }

    return { ok: true }
  })

  return {
    runner: { executeJson },
    token: 'tok',
    t: (_key: string, _replacements: Record<string, string | number> = {}, fallback = '') =>
      fallback,
    replaceUrl: vi.fn(),
  }
}

afterEach(() => {
  vi.useRealTimers()
  resetRealtime()
})

describe('HelpdeskInboxController', () => {
  it('selects tickets and moves with j / k', async () => {
    const env = environment()
    const inbox = new HelpdeskInboxController(schema(), env)

    expect(inbox.move(1)).toBe('1')
    await vi.waitFor(() => expect(inbox.state.ticket?.key).toBe('1'))
    expect(inbox.move(1)).toBe('2')
    expect(inbox.move(-1)).toBe('1')
    expect(inbox.move(-1)).toBe('1')
    expect(env.replaceUrl).toHaveBeenCalledWith(expect.stringContaining('ticket=1'))
    expect(env.runner.executeJson).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'helpdeskTicket' }),
      expect.objectContaining({ component: 'helpdesk', record: '1', token: 'tok' }),
    )
  })

  it('sends views, search and pages under the arguments key', async () => {
    vi.useFakeTimers()
    const env = environment()
    const inbox = new HelpdeskInboxController(schema(), env)

    inbox.setView('breached')
    inbox.setSearch('refund', 100)
    await vi.advanceTimersByTimeAsync(100)

    expect(env.runner.executeJson).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'helpdeskList' }),
      expect.objectContaining({
        arguments: { helpdesk: { view: 'breached', search: 'refund', page: 1 } },
      }),
    )
  })

  it('appends the next page', async () => {
    const executeJson = vi.fn()
    const env = environment(executeJson)
    const inbox = new HelpdeskInboxController(
      schema({ list: { ...schema().list, hasMore: true } }),
      env,
    )

    executeJson.mockResolvedValueOnce({
      list: { view: 'mine', page: 2, views: [], tickets: [summary('4')] },
    })
    await inbox.loadMore()

    expect(inbox.tickets.map((t) => t.key)).toEqual(['1', '2', '3', '4'])
    expect(inbox.state.list.hasMore).toBeUndefined()
  })

  it('sends quick replies and notes, then clears the composer', async () => {
    const env = environment()
    const inbox = new HelpdeskInboxController(schema(), env)
    await inbox.select('2')

    inbox.setMode('note')
    inbox.setText('Checked the logs')
    expect(await inbox.send()).toBe(true)

    expect(env.runner.executeJson).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'helpdeskQuickReply' }),
      expect.objectContaining({
        record: '2',
        arguments: { helpdesk: { text: 'Checked the logs', internal: true } },
      }),
    )
    expect(inbox.state.composer.text).toBe('')
    expect(await inbox.send()).toBe(false)
  })

  it('shows validation errors of a refused reply', async () => {
    const executeJson = vi.fn()
    const env = environment(executeJson)
    const inbox = new HelpdeskInboxController(schema(), env)
    await inbox.select('1')

    inbox.setText('x')
    executeJson.mockRejectedValueOnce(
      new HttpError(422, { message: 'Invalid', errors: { helpdesk: ['Write a message first.'] } }),
    )

    expect(await inbox.send()).toBe(false)
    expect(inbox.state.composer.error).toBe('Write a message first.')
    expect(inbox.state.composer.text).toBe('x')
  })

  it('pings typing at most every three seconds', async () => {
    const env = environment()
    const inbox = new HelpdeskInboxController(schema(), env)
    await inbox.select('1')
    env.runner.executeJson.mockClear()

    inbox.typing(10_000)
    inbox.typing(11_000)
    inbox.typing(13_500)

    expect(
      env.runner.executeJson.mock.calls.filter(([action]) => action.name === 'helpdeskTyping'),
    ).toHaveLength(2)
  })

  it('refreshes on broadcasts and shows the requester typing', async () => {
    vi.useFakeTimers()
    const listeners = new Map<string, (payload: Record<string, unknown>) => void>()
    const channel = {
      notification: vi.fn(),
      listen: vi.fn((event: string, callback: (payload: Record<string, unknown>) => void) =>
        listeners.set(event, callback),
      ),
      stopListening: vi.fn(),
    }
    const echo: EchoLike = { private: vi.fn(() => channel), leave: vi.fn() }
    const env = environment()
    const inbox = new HelpdeskInboxController(
      schema({ live: { channels: ['alfakit.p._.Ticket'], debounce: 50 } }),
      env,
    )
    await inbox.select('2')

    const stop = inbox.start({ echo })

    expect(inbox.state.live).toBe(true)
    expect(echo.private).toHaveBeenCalledWith('alfakit.p._.Ticket')

    listeners.get(HELPDESK_ACTIVITY_EVENT)?.({ ticket: 2, kind: 'typing', actor: 'requester' })
    expect(inbox.state.requesterTyping).toBe(true)
    await vi.advanceTimersByTimeAsync(6000)
    expect(inbox.state.requesterTyping).toBe(false)

    env.runner.executeJson.mockClear()
    listeners.get(RECORD_CHANGED_EVENT)?.({ event: 'updated', key: 2 })
    listeners.get(HELPDESK_ACTIVITY_EVENT)?.({ ticket: 2, kind: 'message', actor: 'requester' })
    await vi.advanceTimersByTimeAsync(50)

    const names = env.runner.executeJson.mock.calls.map(([action]) => action.name)
    expect(names.filter((name) => name === 'helpdeskList')).toHaveLength(1)
    expect(names.filter((name) => name === 'helpdeskTicket')).toHaveLength(1)

    stop()
    expect(channel.stopListening).toHaveBeenCalledTimes(2)
    expect(echo.leave).toHaveBeenCalledWith('alfakit.p._.Ticket')
  })

  it('polls without channels', () => {
    const subscribe = vi.fn(() => () => {})
    const inbox = new HelpdeskInboxController(schema({ pollingInterval: '20s' }), environment())

    inbox.start({ scheduler: { subscribe } as never })

    expect(subscribe).toHaveBeenCalledWith('helpdesk', '20s')
  })

  it('registers its shortcuts in the registry', async () => {
    const registry = new ShortcutRegistry()
    const focusComposer = vi.fn()
    const focusSearch = vi.fn()
    const inbox = new HelpdeskInboxController(schema(), environment())

    const stop = inbox.registerShortcuts({ focusComposer, focusSearch }, registry)

    expect(registry.list().map((shortcut) => shortcut.id)).toEqual(
      expect.arrayContaining(Object.values(HELPDESK_SHORTCUTS)),
    )

    // Reply needs an open ticket.
    registry.trigger(HELPDESK_SHORTCUTS.reply)
    expect(focusComposer).not.toHaveBeenCalled()
    registry.trigger(HELPDESK_SHORTCUTS.next)
    await vi.waitFor(() => expect(inbox.state.ticket?.key).toBe('1'))
    registry.trigger(HELPDESK_SHORTCUTS.note)
    expect(inbox.state.composer.mode).toBe('note')
    expect(focusComposer).toHaveBeenCalled()

    registry.trigger(HELPDESK_SHORTCUTS.search)
    expect(focusSearch).toHaveBeenCalled()

    stop()
    expect(registry.list()).toHaveLength(0)
  })
})

describe('helpers', () => {
  it('reads activity payloads defensively', () => {
    expect(asHelpdeskActivity({ ticket: 1, kind: 'message', actor: 'agent', by: 3 })).toMatchObject(
      { ticket: 1, kind: 'message', actor: 'agent', by: 3 },
    )
    expect(asHelpdeskActivity({ ticket: 1, kind: 'body', actor: 'agent' })).toBeNull()
    expect(asHelpdeskActivity({ kind: 'message' })).toBeNull()
    expect(asHelpdeskActivity({ ticket: '1', kind: 'typing', actor: 'hacker' })?.actor).toBe(
      'system',
    )
  })

  it('maps SLA states and file sizes', () => {
    expect(helpdeskSlaTone('breached')).toBe('danger')
    expect(helpdeskSlaTone('due_soon')).toBe('warning')
    expect(helpdeskSlaTone('none')).toBe('gray')
    expect(helpdeskFileSize(512, String)).toBe('512 B')
    expect(helpdeskFileSize(2048, String)).toBe('2 KB')
    expect(helpdeskFileSize(null, String)).toBeNull()
  })
})

describe('HelpdeskChatClient', () => {
  const config: HelpdeskChatConfig = {
    enabled: true,
    greeting: 'Hi!',
    pollingInterval: 4,
    requireEmail: false,
    askContact: true,
    maxLength: 50,
    honeypot: '_website',
    strings: { typing: ':name is typing…', failed: 'Failed' },
  }

  it('interpolates server strings', () => {
    expect(helpdeskChatString(config, 'typing', 'x', { name: 'Dana' })).toBe('Dana is typing…')
    expect(helpdeskChatString(null, 'missing', 'Fallback')).toBe('Fallback')
  })

  it('loads, starts a chat with the honeypot and then posts messages', async () => {
    const request = vi.fn()
    request.mockResolvedValueOnce({ config, conversation: null })
    request.mockResolvedValueOnce({
      conversation: {
        key: '7',
        status: 'open',
        messages: [{ key: '1', from: 'visitor', name: 'You', html: '<p>Hi</p>' }],
      },
    })
    request.mockResolvedValueOnce({ conversation: { key: '7', status: 'open', messages: [] } })

    const chat = new HelpdeskChatClient({ request: request as never })
    chat.setOpen(true)
    await vi.waitFor(() => expect(chat.state.status).toBe('ready'))

    chat.setContact({ name: 'Vic', email: 'vic@example.com' })
    chat.setDraft('Hi')
    expect(await chat.send()).toBe(true)
    expect(request).toHaveBeenLastCalledWith('/support/chat', {
      method: 'POST',
      body: { message: 'Hi', name: 'Vic', email: 'vic@example.com', _website: undefined },
    })

    chat.setDraft('Again')
    await chat.send()
    expect(request).toHaveBeenLastCalledWith('/support/chat/messages', {
      method: 'POST',
      body: { message: 'Again' },
    })
    chat.stop()
  })

  it('refuses messages over the length limit and reports rate limits', async () => {
    const request = vi.fn()
    request.mockResolvedValueOnce({ config, conversation: null })
    const chat = new HelpdeskChatClient({ request: request as never })
    await chat.load()

    chat.setDraft('x'.repeat(51))
    expect(await chat.send()).toBe(false)
    expect(chat.state.error).toBe('Failed')

    request.mockRejectedValueOnce(new HttpError(429, { message: 'Too many' }))
    chat.setDraft('Hello')
    expect(await chat.send()).toBe(false)
    expect(chat.state.error).toBe('Too many messages. Please wait a moment.')
    chat.stop()
  })

  it('counts agent messages that arrive while closed', async () => {
    vi.useFakeTimers()
    const request = vi.fn()
    request.mockResolvedValueOnce({
      config,
      conversation: { key: '7', status: 'open', messages: [] },
    })
    request.mockResolvedValueOnce({
      conversation: {
        key: '7',
        status: 'open',
        messages: [{ key: '9', from: 'agent', name: 'Dana', html: '<p>Hi</p>' }],
      },
    })

    const chat = new HelpdeskChatClient({ request: request as never })
    await chat.load()
    await vi.advanceTimersByTimeAsync(20_000)

    expect(chat.state.unread).toBe(1)
    chat.setOpen(true)
    expect(chat.state.unread).toBe(0)
    chat.stop()
  })
})
