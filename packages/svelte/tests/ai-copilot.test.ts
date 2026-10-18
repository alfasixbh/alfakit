import type { AiCopilotSchema } from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte'
import RenderComponent from '../src/components/schema/RenderComponent.svelte'
import { registry } from './mocks'
import Wrapper from './Wrapper.svelte'

const copilot: AiCopilotSchema = {
  type: 'ai:copilot',
  key: 'ai-copilot',
  endpoints: {
    conversations: '/ai/_ai/copilot/conversations',
    conversation: '/ai/_ai/copilot/conversations/__ID__',
    send: '/ai/_ai/copilot/messages',
    confirm: '/ai/_ai/copilot/actions/__ID__/confirm',
    reject: '/ai/_ai/copilot/actions/__ID__/reject',
    delete: '/ai/_ai/copilot/conversations/__ID__',
  },
  placeholder: '__ID__',
  keyBindings: ['mod+j'],
  currency: 'USD',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mountCopilot() {
  return render(Wrapper, { props: { component: RenderComponent, props: { component: copilot } } })
}

describe('AI copilot', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('is registered as ai:copilot and shows only its button until opened', () => {
    expect(registry.has('ai:copilot')).toBe(true)

    mountCopilot()

    expect(screen.getByRole('button', { name: 'Open AI copilot' })).toHaveAttribute(
      'data-slot',
      'ai-copilot-trigger',
    )
    expect(document.querySelector('[data-slot="ai-copilot-panel"]')).toBeNull()
  })

  it('asks a question and confirms a proposed action', async () => {
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/messages')) {
        return json({
          conversation: { id: 5, title: 'Mark SO-1 paid' },
          messages: [
            { id: 1, role: 'user', content: JSON.parse(String(init?.body)).message },
            {
              id: 2,
              role: 'action',
              content: 'Paid by wire.',
              action: { label: 'Mark paid', record: 'Order SO-1', status: 'pending', inputs: [] },
            },
            {
              id: 3,
              role: 'assistant',
              content: 'Please confirm.',
              activity: [{ tool: 'read_record', label: 'Read Order SO-1' }],
              usage: { inputTokens: 120, outputTokens: 30, cost: 0.0004 },
            },
          ],
        })
      }

      return json({
        messages: [
          {
            id: 2,
            role: 'action',
            content: 'Paid by wire.',
            action: { label: 'Mark paid', record: 'Order SO-1', status: 'confirmed' },
          },
          { id: 4, role: 'assistant', content: 'Done: Mark paid on Order SO-1.' },
        ],
      })
    })
    vi.stubGlobal('fetch', fetch)

    mountCopilot()
    await fireEvent.click(screen.getByRole('button', { name: 'Open AI copilot' }))

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText('AI can make mistakes. Check important information.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('How can I help?')).toBeInTheDocument()

    const box = within(dialog).getByRole('textbox', { name: 'Ask about your data…' })
    await fireEvent.input(box, { target: { value: 'Mark SO-1 paid' } })
    await fireEvent.keyDown(box, { key: 'Enter' })

    await within(dialog).findByText('Waiting for your confirmation')
    expect(fetch.mock.calls[0]![0]).toBe('/ai/_ai/copilot/messages')
    expect(within(dialog).getByText('Read Order SO-1')).toBeInTheDocument()
    expect(dialog.querySelector('[data-slot="ai-usage"]')).toHaveTextContent(
      '150 tokens · ≈ $0.0004',
    )

    await fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }))

    await within(dialog).findByText('Done: Mark paid on Order SO-1.')
    expect(fetch.mock.calls[1]![0]).toBe('/ai/_ai/copilot/actions/2/confirm')
    expect(dialog.querySelector('[data-slot="ai-action-card"]')).toHaveAttribute(
      'data-status',
      'confirmed',
    )
  })

  it('shows the server error and keeps the question', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ message: 'Too many AI requests. Try again in 30 seconds.' }, 429)),
    )

    mountCopilot()
    await fireEvent.click(screen.getByRole('button', { name: 'Open AI copilot' }))
    const dialog = await screen.findByRole('dialog')
    const box = within(dialog).getByRole('textbox', { name: 'Ask about your data…' })

    await fireEvent.input(box, { target: { value: 'Hello' } })
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Send' }))

    await waitFor(() =>
      expect(within(dialog).getByRole('alert')).toHaveTextContent('Too many AI requests'),
    )
    expect(box).toHaveValue('Hello')
  })

  it('shows the setup notice and labels sample answers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({
          conversation: { id: 7, title: 'search acme' },
          messages: [
            { id: 1, role: 'user', content: 'search acme' },
            { id: 2, role: 'assistant', content: 'I found one record.', demo: true },
          ],
        }),
      ),
    )

    render(Wrapper, {
      props: {
        component: RenderComponent,
        props: {
          component: {
            ...copilot,
            notice: {
              status: 'info',
              heading: "Sample answer — AI isn't configured",
              description: 'These answers are generated locally as examples, not by an AI model.',
            },
          },
        },
      },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Open AI copilot' }))
    const dialog = await screen.findByRole('dialog')
    const notice = dialog.querySelector('[data-slot="ai-notice"]')

    expect(notice).toHaveAttribute('data-status', 'info')
    expect(notice).toHaveTextContent("Sample answer — AI isn't configured")

    const box = within(dialog).getByRole('textbox', { name: 'Ask about your data…' })
    await fireEvent.input(box, { target: { value: 'search acme' } })
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Send' }))

    await within(dialog).findByText('I found one record.')
    expect(dialog.querySelector('[data-role="assistant"] [data-ai-sample]')).toHaveTextContent(
      "Sample answer — AI isn't configured",
    )
  })
})
