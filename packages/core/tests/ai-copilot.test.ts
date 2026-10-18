import { describe, expect, it, vi } from 'vitest'
import { CopilotController, copilotBlocks } from '../src/ai-copilot'
import { HttpError } from '../src/http'
import type { AiCopilotSchema, AiMessageSchema } from '../src/schema/ai'

const schema: AiCopilotSchema = {
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
}

function memoryStorage() {
  const values = new Map<string, string>()

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  }
}

const proposal: AiMessageSchema = {
  id: 3,
  role: 'action',
  content: 'Paid by wire.',
  action: { label: 'Mark paid', record: 'Order SO-1', status: 'pending' },
}

describe('CopilotController', () => {
  it('sends a question with the page and keeps the answer', async () => {
    const request = vi.fn().mockResolvedValue({
      conversation: { id: 7, title: 'Hi' },
      messages: [
        { id: 1, role: 'user', content: 'Hi' },
        {
          id: 2,
          role: 'assistant',
          content: 'Hello!',
          usage: { inputTokens: 10, outputTokens: 5, cost: 0.001 },
        },
      ],
    })
    const copilot = new CopilotController(schema, {
      request,
      pageUrl: () => '/ai/orders',
      storage: memoryStorage(),
    })

    copilot.setDraft('Hi')
    const sending = copilot.send()

    expect(copilot.state.sending).toBe(true)
    expect(copilot.state.messages.map((message) => message.content)).toEqual(['Hi'])
    expect(copilot.state.draft).toBe('')

    await sending

    expect(request).toHaveBeenCalledWith('/ai/_ai/copilot/messages', {
      method: 'POST',
      body: { message: 'Hi', conversation: undefined, page: '/ai/orders' },
    })
    expect(copilot.state.sending).toBe(false)
    expect(copilot.state.conversation).toEqual({ id: 7, title: 'Hi' })
    expect(copilot.state.messages.map((message) => message.id)).toEqual([1, 2])
    expect(copilot.totals()).toEqual({ inputTokens: 10, outputTokens: 5, cost: 0.001 })

    await copilot.send('Again?')

    expect(request.mock.calls[1]![1].body.conversation).toBe(7)
  })

  it('gives the question back and shows the server message when it fails', async () => {
    const request = vi
      .fn()
      .mockRejectedValue(new HttpError(429, { message: 'Too many AI requests.' }))
    const copilot = new CopilotController(schema, { request, storage: memoryStorage() })

    await copilot.send('Hello?')

    expect(copilot.state.messages).toEqual([])
    expect(copilot.state.draft).toBe('Hello?')
    expect(copilot.state.error).toEqual({ message: 'Too many AI requests.' })

    request.mockRejectedValueOnce(new HttpError(500, { message: 'Server Error' }))
    await copilot.send('x')

    expect(copilot.state.error).toEqual({})
  })

  it('confirms a proposal through the server and merges the result', async () => {
    const request = vi.fn().mockResolvedValue({
      messages: [
        { ...proposal, action: { ...proposal.action!, status: 'confirmed' } },
        { id: 4, role: 'assistant', content: 'Done: Mark paid on Order SO-1.' },
      ],
    })
    const copilot = new CopilotController(schema, { request, storage: memoryStorage() })
    copilot.store.update({ messages: [proposal] })

    const deciding = copilot.decide(3, 'confirm')

    expect(copilot.state.deciding).toEqual({ 3: 'confirm' })

    await deciding

    expect(request).toHaveBeenCalledWith('/ai/_ai/copilot/actions/3/confirm', { method: 'POST' })
    expect(copilot.state.deciding).toEqual({})
    expect(
      copilot.state.messages.map((message) => message.action?.status ?? message.content),
    ).toEqual(['confirmed', 'Done: Mark paid on Order SO-1.'])
  })

  it('remembers the open conversation for the tab and reopens it', async () => {
    const storage = memoryStorage()
    const request = vi
      .fn()
      .mockResolvedValue({ conversation: { id: 9, title: 'Old' }, messages: [proposal] })
    storage.setItem(`alfakit-ai-copilot:${schema.endpoints.send}`, '9')

    const copilot = new CopilotController(schema, { request, storage })
    copilot.open()
    await vi.waitFor(() => expect(copilot.state.loading).toBe(false))

    expect(request).toHaveBeenCalledWith('/ai/_ai/copilot/conversations/9')
    expect(copilot.state.conversation?.id).toBe(9)

    copilot.newConversation()

    expect(storage.getItem(`alfakit-ai-copilot:${schema.endpoints.send}`)).toBeNull()
    expect(copilot.state.messages).toEqual([])
  })

  it('lists and deletes conversations', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        conversations: [
          { id: 1, title: 'A' },
          { id: 2, title: 'B' },
        ],
      })
      .mockResolvedValueOnce({ deleted: true })
    const copilot = new CopilotController(schema, { request, storage: memoryStorage() })

    await copilot.showHistory()
    expect(copilot.state.view).toBe('history')
    expect(copilot.state.conversations).toHaveLength(2)

    await copilot.deleteConversation(1)
    expect(request).toHaveBeenLastCalledWith('/ai/_ai/copilot/conversations/1', {
      method: 'DELETE',
    })
    expect(copilot.state.conversations.map((conversation) => conversation.id)).toEqual([2])
  })
})

describe('copilotBlocks', () => {
  it('splits plain text into paragraphs and lists without HTML', () => {
    expect(
      copilotBlocks('Two orders:\n- **SO-1** (paid)\n- SO-2\n\n1. first\n2. second\n\n<b>bye</b>'),
    ).toEqual([
      { type: 'p', lines: ['Two orders:'] },
      { type: 'ul', lines: ['SO-1 (paid)', 'SO-2'] },
      { type: 'ol', lines: ['first', 'second'] },
      { type: 'p', lines: ['<b>bye</b>'] },
    ])
  })
})
