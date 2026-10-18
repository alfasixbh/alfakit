import type { AiCopilotSchema } from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { RenderComponent } from '../src/components/schema/schema-renderer'
import { Wrapper, registry } from './mocks'

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

describe('AI copilot', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('is registered as ai:copilot and renders its button on the server', () => {
    expect(registry.has('ai:copilot')).toBe(true)

    const html = renderToString(
      <Wrapper>
        <RenderComponent component={copilot} />
      </Wrapper>,
    )

    expect(html).toContain('data-slot="ai-copilot-trigger"')
    expect(html).toContain('aria-label="Open AI copilot"')
    expect(html).not.toContain('ai-copilot-panel')
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
              content: 'Please confirm:\n- Mark paid',
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

    render(
      <Wrapper>
        <RenderComponent component={copilot} />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open AI copilot' }))

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText('AI can make mistakes. Check important information.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('How can I help?')).toBeInTheDocument()

    const box = within(dialog).getByRole('textbox', { name: 'Ask about your data…' })
    fireEvent.change(box, { target: { value: 'Mark SO-1 paid' } })
    fireEvent.keyDown(box, { key: 'Enter' })

    await within(dialog).findByText('Waiting for your confirmation')
    expect(fetch.mock.calls[0]![0]).toBe('/ai/_ai/copilot/messages')
    expect(within(dialog).getByText('Read Order SO-1')).toBeInTheDocument()
    expect(within(dialog).getByText('Waiting for your confirmation')).toBeInTheDocument()
    expect(within(dialog).getAllByText(/150 tokens/)).toHaveLength(2)
    expect(dialog.querySelector('[data-slot="ai-usage"]')).toHaveTextContent(
      '150 tokens · ≈ $0.0004',
    )

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }))

    await within(dialog).findByText('Done: Mark paid on Order SO-1.')
    expect(fetch.mock.calls[1]![0]).toBe('/ai/_ai/copilot/actions/2/confirm')
    expect(within(dialog).getByText('Done')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Confirm' })).toBeNull()
  })

  it('shows the server error and keeps the question', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ message: 'Too many AI requests. Try again in 30 seconds.' }, 429)),
    )

    render(
      <Wrapper>
        <RenderComponent component={copilot} />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open AI copilot' }))
    const dialog = await screen.findByRole('dialog')
    const box = within(dialog).getByRole('textbox', { name: 'Ask about your data…' })

    fireEvent.change(box, { target: { value: 'Hello' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send' }))

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

    render(
      <Wrapper>
        <RenderComponent
          component={{
            ...copilot,
            notice: {
              status: 'info',
              heading: "Sample answer — AI isn't configured",
              description: 'These answers are generated locally as examples, not by an AI model.',
            },
          }}
        />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open AI copilot' }))
    const dialog = await screen.findByRole('dialog')
    const notice = dialog.querySelector('[data-slot="ai-notice"]')

    expect(notice).toHaveAttribute('data-status', 'info')
    expect(notice).toHaveTextContent("Sample answer — AI isn't configured")

    const box = within(dialog).getByRole('textbox', { name: 'Ask about your data…' })
    fireEvent.change(box, { target: { value: 'search acme' } })
    fireEvent.keyDown(box, { key: 'Enter' })

    await within(dialog).findByText('I found one record.')
    expect(dialog.querySelector('[data-role="assistant"] [data-ai-sample]')).toHaveTextContent(
      "Sample answer — AI isn't configured",
    )
  })
})
