import type { HelpdeskInboxSchema, HelpdeskTicket } from '@alfakit/core'
import { shortcuts } from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { PageActionProvider } from '../src/components/actions/action-context'
import { HelpdeskChat } from '../src/components/helpdesk'
import { RenderComponent } from '../src/components/schema/schema-renderer'
import { Wrapper, actions, registry } from './mocks'

const badge = (value: string, label: string, color = 'gray') => ({ value, label, color })

const inbox = (extra: Partial<HelpdeskInboxSchema> = {}): HelpdeskInboxSchema => ({
  type: 'helpdesk:inbox',
  key: 'helpdesk-inbox',
  actionComponent: 'helpdesk',
  argumentsKey: 'helpdesk',
  listAction: 'helpdeskList',
  ticketAction: 'helpdeskTicket',
  typingAction: 'helpdeskTyping',
  replyAction: 'helpdeskQuickReply',
  view: 'mine',
  list: {
    view: 'mine',
    page: 1,
    views: [
      { key: 'mine', label: 'My open tickets', icon: 'user-round', count: 2 },
      { key: 'breached', label: 'Breached', icon: 'triangle-alert', color: 'danger', count: 1 },
    ],
    tickets: [
      {
        key: '1',
        reference: '#1',
        subject: 'Printer on fire',
        requester: 'Casey',
        excerpt: 'It is smoking',
        awaitingReply: true,
        status: badge('open', 'Open', 'danger'),
        priority: badge('urgent', 'Urgent', 'danger'),
        sla: {
          state: 'breached',
          label: 'Breached',
          color: 'danger',
          dueAt: '2026-01-01T00:00:00+00:00',
        },
        channel: 'portal',
        channelIcon: 'layout-panel-top',
      },
      {
        key: '2',
        reference: '#2',
        subject: 'Invoice copy',
        requester: 'Robin',
        status: badge('open', 'Open', 'danger'),
        priority: badge('normal', 'Normal', 'info'),
        sla: { state: 'on_track', label: 'On track', color: 'success' },
        channel: 'chat',
        channelIcon: 'messages-square',
      },
    ],
  },
  live: { channels: [], debounce: 0 },
  ...extra,
})

const ticket = (key: string): HelpdeskTicket => ({
  key,
  reference: `#${key}`,
  subject: key === '1' ? 'Printer on fire' : 'Invoice copy',
  status: badge('open', 'Open', 'danger'),
  priority: badge('urgent', 'Urgent', 'danger'),
  type: { value: 'incident', label: 'Incident' },
  channel: { value: 'portal', label: 'Portal', icon: 'layout-panel-top' },
  requester: { name: 'Casey', email: 'casey@example.com' },
  sla: { summary: { state: 'breached', label: 'Breached', color: 'danger' } },
  messages: [
    {
      key: 'm1',
      kind: 'reply',
      fromRequester: true,
      author: { name: 'Casey' },
      html: '<p>It is smoking</p>',
    },
    { key: 'm2', kind: 'note', author: { name: 'Dana' }, html: '<p>Call the fire brigade</p>' },
    {
      key: 'm3',
      kind: 'event',
      author: { name: 'Dana' },
      html: '<p>Dana assigned the ticket to Dana</p>',
    },
  ],
  actions: [{ type: 'Action', name: 'solve', label: 'Solve', hasAction: true }],
  canReply: true,
})

function renderInbox(schema = inbox()) {
  return render(
    <Wrapper>
      <PageActionProvider value={{ token: 'tok', component: 'page' }}>
        <RenderComponent component={schema as never} />
      </PageActionProvider>
    </Wrapper>,
  )
}

function mockServer() {
  return vi.spyOn(actions, 'executeJson').mockImplementation(async (action, context) => {
    if (action.name === 'helpdeskTicket' || action.name === 'helpdeskQuickReply') {
      return { ticket: ticket(String(context.record)) } as never
    }

    if (action.name === 'helpdeskList') return { list: inbox().list } as never

    return { ok: true } as never
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('helpdesk inbox', () => {
  it('is registered as helpdesk:inbox and renders a skeleton on the server', () => {
    expect(registry.has('helpdesk:inbox')).toBe(true)

    const html = renderToString(
      <Wrapper>
        <RenderComponent component={inbox() as never} />
      </Wrapper>,
    )

    expect(html).toContain('data-slot="helpdesk-inbox"')
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('Printer on fire')
  })

  it('shows the views and tickets, and opens a ticket with its notes', async () => {
    const executeJson = mockServer()
    renderInbox()

    const views = await screen.findByRole('navigation', { name: 'Views' })

    expect(within(views).getByRole('button', { name: /My open tickets/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByText('Awaiting your reply')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Printer on fire').closest('button')!)

    const pane = await screen.findByRole('region', { name: '#1 Printer on fire' })

    expect(within(pane).getByText('Call the fire brigade')).toBeInTheDocument()
    expect(within(pane).getAllByText('Internal note').length).toBeGreaterThan(0)
    expect(within(pane).getByRole('group', { name: 'Ticket actions' })).toBeInTheDocument()
    expect(pane.querySelector('[data-slot="helpdesk-message"][data-kind="note"]')).not.toBeNull()
    expect(executeJson).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'helpdeskTicket' }),
      expect.objectContaining({ component: 'helpdesk', record: '1' }),
    )
  })

  it('switches views through the list action', async () => {
    const executeJson = mockServer()
    renderInbox()

    const views = await screen.findByRole('navigation', { name: 'Views' })

    fireEvent.click(within(views).getByRole('button', { name: /Breached/ }))

    await waitFor(() =>
      expect(executeJson).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'helpdeskList' }),
        expect.objectContaining({
          arguments: { helpdesk: { view: 'breached', search: '', page: 1 } },
        }),
      ),
    )
  })

  it('sends a quick reply with Enter and an internal note', async () => {
    const executeJson = mockServer()
    renderInbox(inbox({ selected: '1' }))

    const composer = await screen.findByPlaceholderText('Reply to Casey…')

    fireEvent.change(composer, { target: { value: 'On our way' } })
    fireEvent.keyDown(composer, { key: 'Enter' })

    await waitFor(() =>
      expect(executeJson).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'helpdeskQuickReply' }),
        expect.objectContaining({
          record: '1',
          arguments: { helpdesk: { text: 'On our way', internal: false } },
        }),
      ),
    )

    fireEvent.click(screen.getByRole('radio', { name: 'Internal note' }))
    const note = screen.getByPlaceholderText('Add a note only agents can see…')
    fireEvent.change(note, { target: { value: 'VIP' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))

    await waitFor(() =>
      expect(executeJson).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'helpdeskQuickReply' }),
        expect.objectContaining({ arguments: { helpdesk: { text: 'VIP', internal: true } } }),
      ),
    )
  })

  it('moves with j / k and focuses the composer with r', async () => {
    mockServer()
    renderInbox()
    await screen.findByRole('navigation', { name: 'Views' })

    act(() => {
      shortcuts.trigger('helpdesk.next')
    })

    const composer = await screen.findByPlaceholderText('Reply to Casey…')

    act(() => {
      shortcuts.trigger('helpdesk.reply')
    })

    await waitFor(() => expect(composer).toHaveFocus())
  })
})

describe('helpdesk chat widget', () => {
  const config = {
    enabled: true,
    greeting: 'Hello! How can we help?',
    pollingInterval: 4,
    requireEmail: false,
    askContact: true,
    maxLength: 4000,
    honeypot: '_website',
    strings: {
      open: 'Open chat',
      close: 'Close chat',
      title: 'Chat with us',
      placeholder: 'Write a message…',
      start: 'Start chat',
      send: 'Send',
      name: 'Your name',
      email: 'Your email',
      messages: 'Messages',
    },
  }

  function mockFetch(responses: unknown[]) {
    const queue = [...responses]

    return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      const body = queue.length > 1 ? queue.shift() : queue[0]

      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
  }

  it('renders nothing on the server', () => {
    expect(renderToString(<HelpdeskChat />)).toBe('')
  })

  it('opens an accessible chat and starts a conversation', async () => {
    const fetch = mockFetch([
      { config, conversation: null },
      {
        conversation: {
          key: '9',
          status: 'open',
          messages: [{ key: '1', from: 'visitor', name: 'You', html: '<p>Hi there</p>' }],
        },
      },
    ])
    render(<HelpdeskChat endpoint="/support/chat" />)

    const launcher = await screen.findByRole('button', { name: 'Open chat' })

    expect(launcher).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(launcher)

    const dialog = await screen.findByRole('dialog', { name: 'Chat with us' })

    expect(within(dialog).getByRole('log')).toHaveTextContent('Hello! How can we help?')

    fireEvent.change(within(dialog).getByLabelText('Your name'), { target: { value: 'Vic' } })
    fireEvent.change(within(dialog).getByPlaceholderText('Write a message…'), {
      target: { value: 'Hi there' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start chat' }))

    await within(dialog).findByText('Hi there', { selector: 'p' })

    const [url, init] = fetch.mock.calls.at(-1)!

    expect(url).toBe('/support/chat')
    expect(JSON.parse(String(init?.body))).toMatchObject({ message: 'Hi there', name: 'Vic' })

    fireEvent.keyDown(dialog, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: 'Open chat' })).toHaveFocus()
  })
})
