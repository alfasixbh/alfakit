import type { HelpdeskInboxSchema, HelpdeskTicket } from '@alfakit/core'
import { Translator, shortcuts } from '@alfakit/core'
import { mount } from '@vue/test-utils'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { HelpdeskChat } from '../src/components/helpdesk'
import RenderComponent from '../src/components/schema/RenderComponent.vue'
import { ALFAKIT_KEY } from '../src/context'
import { actions, flush, mountWithAlfakit, panel, registry, setPageProps } from './mocks'

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
        awaitingReply: true,
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

async function loaded(selector: string) {
  await vi.waitFor(() => {
    if (!document.querySelector(selector)) throw new Error('Not loaded yet')
  })
  await flush()
}

beforeEach(() => {
  setPageProps({ page: { token: 'tok' } as never })
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('helpdesk inbox', () => {
  it('is registered as helpdesk:inbox and renders a skeleton on the server', async () => {
    expect(registry.has('helpdesk:inbox')).toBe(true)

    const app = createSSRApp({ render: () => h(RenderComponent, { component: inbox() as never }) })
    app.provide(ALFAKIT_KEY, {
      registry,
      pages: {},
      actions,
      translator: new Translator(panel.translations),
    })
    const html = await renderToString(app)

    expect(html).toContain('data-slot="helpdesk-inbox"')
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('Printer on fire')
  })

  it('opens a ticket with its notes and sends a quick reply with Enter', async () => {
    const executeJson = mockServer()
    mountWithAlfakit(() => h(RenderComponent, { component: inbox() as never }))
    await loaded('[data-slot="helpdesk-views"]')

    expect(
      document.querySelector('[data-slot="helpdesk-views"] [aria-current="page"]')?.textContent,
    ).toContain('My open tickets')

    document.querySelector<HTMLButtonElement>('[data-ticket="1"]')!.click()
    await loaded('[data-slot="helpdesk-message"][data-kind="note"]')

    expect(document.querySelector('[data-slot="helpdesk-ticket"]')?.textContent).toContain(
      'Call the fire brigade',
    )

    const composer = document.querySelector<HTMLTextAreaElement>(
      '[data-slot="helpdesk-composer"] textarea',
    )!
    composer.value = 'On our way'
    composer.dispatchEvent(new Event('input'))
    composer.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
    await flush()

    expect(executeJson).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'helpdeskQuickReply' }),
      expect.objectContaining({
        record: '1',
        arguments: { helpdesk: { text: 'On our way', internal: false } },
      }),
    )
  })

  it('switches views and registers the j / k / r shortcuts', async () => {
    const executeJson = mockServer()
    mountWithAlfakit(() => h(RenderComponent, { component: inbox() as never }))
    await loaded('[data-slot="helpdesk-views"]')

    ;[...document.querySelectorAll<HTMLButtonElement>('[data-slot="helpdesk-views"] button')]
      .find((b) => b.textContent?.includes('Breached'))!
      .click()
    await flush()

    expect(executeJson).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'helpdeskList' }),
      expect.objectContaining({
        arguments: { helpdesk: { view: 'breached', search: '', page: 1 } },
      }),
    )
    expect(shortcuts.has('helpdesk.next')).toBe(true)
    expect(shortcuts.has('helpdesk.reply')).toBe(true)
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
    },
  }

  it('renders nothing on the server', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(HelpdeskChat) }))

    expect(html).not.toContain('helpdesk-chat-widget')
    expect(html).not.toContain('<button')
  })

  it('opens an accessible chat with the greeting and starts a conversation', async () => {
    const request = vi.fn()
    request.mockResolvedValueOnce({ config, conversation: null })
    request.mockResolvedValueOnce({
      conversation: {
        key: '9',
        status: 'open',
        messages: [{ key: '1', from: 'visitor', name: 'You', html: '<p>Hi there</p>' }],
      },
    })

    mount(HelpdeskChat, { props: { request }, attachTo: document.body })
    await loaded('[data-slot="helpdesk-chat-widget"] button')

    const launcher = document.querySelector<HTMLButtonElement>(
      '[data-slot="helpdesk-chat-widget"] > button',
    )!

    expect(launcher.getAttribute('aria-label')).toBe('Open chat')
    expect(launcher.getAttribute('aria-expanded')).toBe('false')

    launcher.click()
    await loaded('[role="dialog"]')

    const dialog = document.querySelector('[role="dialog"]')!

    expect(dialog.querySelector('[role="log"]')?.textContent).toContain('Hello! How can we help?')

    const composer = dialog.querySelector<HTMLTextAreaElement>('textarea')!
    composer.value = 'Hi there'
    composer.dispatchEvent(new Event('input'))
    await flush()
    dialog
      .querySelector<HTMLFormElement>('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }))
    await flush()

    expect(request).toHaveBeenLastCalledWith(
      '/support/chat',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ message: 'Hi there' }),
      }),
    )
  })
})
