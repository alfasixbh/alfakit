import type { HelpdeskInboxSchema, HelpdeskTicket } from '@alfakit/core'
import { shortcuts } from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte'
import { HelpdeskChat } from '../src/components/helpdesk'
import RenderComponent from '../src/components/schema/RenderComponent.svelte'
import { actions, registry, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

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
        status: badge('open', 'Open', 'danger'),
        priority: badge('urgent', 'Urgent', 'danger'),
        sla: { state: 'breached', label: 'Breached', color: 'danger' },
        channel: 'portal',
        channelIcon: 'layout-panel-top',
      },
    ],
  },
  live: { channels: [], debounce: 0 },
  ...extra,
})

const ticket = (key: string): HelpdeskTicket => ({
  key,
  reference: `#${key}`,
  subject: 'Printer on fire',
  status: badge('open', 'Open', 'danger'),
  priority: badge('urgent', 'Urgent', 'danger'),
  type: { value: 'incident', label: 'Incident' },
  channel: { value: 'portal', label: 'Portal', icon: 'layout-panel-top' },
  requester: { name: 'Casey' },
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
  ],
  actions: [],
  canReply: true,
})

function mockServer() {
  return vi.spyOn(actions, 'executeJson').mockImplementation(async (action, context) => {
    if (action.name === 'helpdeskTicket' || action.name === 'helpdeskQuickReply') {
      return { ticket: ticket(String(context.record)) } as never
    }

    if (action.name === 'helpdeskList') return { list: inbox().list } as never

    return { ok: true } as never
  })
}

const renderInbox = (schema = inbox()) =>
  render(Wrapper, { props: { component: RenderComponent, props: { component: schema } } })

beforeEach(() => {
  setPageProps({ page: { token: 'tok' } as never })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('helpdesk inbox', () => {
  it('is registered as helpdesk:inbox and shows a skeleton until it loads', async () => {
    mockServer()
    expect(registry.has('helpdesk:inbox')).toBe(true)

    const { container } = renderInbox()

    expect(container.querySelector('[data-slot="helpdesk-inbox"][aria-busy="true"]')).not.toBeNull()
    expect(await screen.findByText('Printer on fire')).toBeInTheDocument()
  })

  it('opens a ticket with its notes and sends a quick reply with Enter', async () => {
    const executeJson = mockServer()
    renderInbox()

    await fireEvent.click((await screen.findByText('Printer on fire')).closest('button')!)

    const pane = await screen.findByRole('region', { name: '#1 Printer on fire' })

    expect(await within(pane).findByText('Call the fire brigade')).toBeInTheDocument()

    const composer = within(pane).getByPlaceholderText('Reply to Casey…')

    await fireEvent.input(composer, { target: { value: 'On our way' } })
    await fireEvent.keyDown(composer, { key: 'Enter' })

    await waitFor(() =>
      expect(executeJson).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'helpdeskQuickReply' }),
        expect.objectContaining({
          record: '1',
          arguments: { helpdesk: { text: 'On our way', internal: false } },
        }),
      ),
    )
  })

  it('switches views and registers its shortcuts', async () => {
    const executeJson = mockServer()
    renderInbox()

    const views = await screen.findByRole('navigation', { name: 'Views' })
    await fireEvent.click(within(views).getByRole('button', { name: /Breached/ }))

    await waitFor(() =>
      expect(executeJson).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'helpdeskList' }),
        expect.objectContaining({
          arguments: { helpdesk: { view: 'breached', search: '', page: 1 } },
        }),
      ),
    )
    expect(shortcuts.has('helpdesk.next')).toBe(true)
    expect(shortcuts.has('helpdesk.note')).toBe(true)
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
      title: 'Chat with us',
      placeholder: 'Write a message…',
      start: 'Start chat',
      name: 'Your name',
    },
  }

  it('opens an accessible chat and starts a conversation', async () => {
    const request = vi.fn()
    request.mockResolvedValueOnce({ config, conversation: null })
    request.mockResolvedValueOnce({
      conversation: {
        key: '9',
        status: 'open',
        messages: [{ key: '1', from: 'visitor', name: 'You', html: '<p>Hi there</p>' }],
      },
    })

    render(HelpdeskChat, { props: { request } })

    const launcher = await screen.findByRole('button', { name: 'Open chat' })

    expect(launcher).toHaveAttribute('aria-expanded', 'false')

    await fireEvent.click(launcher)

    const dialog = await screen.findByRole('dialog', { name: 'Chat with us' })

    expect(within(dialog).getByRole('log')).toHaveTextContent('Hello! How can we help?')

    await fireEvent.input(within(dialog).getByPlaceholderText('Write a message…'), {
      target: { value: 'Hi there' },
    })
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Start chat' }))

    await waitFor(() =>
      expect(request).toHaveBeenLastCalledWith(
        '/support/chat',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({ message: 'Hi there' }),
        }),
      ),
    )

    await fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
