import { afterEach, describe, expect, it, vi } from 'vitest'
import { CopilotController } from '../src/ai-copilot'
import {
  AiStreamController,
  parseEventStream,
  readEventStream,
  StreamAnnouncer,
  type StreamEvent,
} from '../src/ai-stream'
import type { AiCopilotSchema } from '../src/schema/ai'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function sse(events: Array<[string, Record<string, unknown>]>): string {
  return events
    .map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    .join('')
}

/** A fake reader that hands the given events over one at a time. */
function fakeRead(events: StreamEvent[], wait?: Promise<void>): typeof readEventStream {
  return async (_url, _body, onEvent, signal) => {
    for (const event of events) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      onEvent(event)
      await (wait ?? Promise.resolve())
    }
  }
}

describe('parseEventStream', () => {
  it('splits complete events and keeps the rest of the buffer', () => {
    const text = sse([
      ['delta', { text: 'Hel' }],
      ['delta', { text: 'lo' }],
    ])
    const { events, rest } = parseEventStream(`${text}event: done\ndata: {"te`)

    expect(events).toEqual([
      { event: 'delta', data: { text: 'Hel' } },
      { event: 'delta', data: { text: 'lo' } },
    ])
    expect(rest).toBe('event: done\ndata: {"te')
    expect(parseEventStream('event: x\ndata: not json\n\n').events).toEqual([])
  })
})

describe('readEventStream', () => {
  it('reads server-sent events from a fetch body with the CSRF token', async () => {
    const encoder = new TextEncoder()
    const body = sse([
      ['delta', { text: 'Hi ' }],
      ['done', { text: 'Hi there' }],
    ])
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(body.slice(0, 10)))
        controller.enqueue(encoder.encode(body.slice(10)))
        controller.close()
      },
    })
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }))
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'XSRF-TOKEN=abc'

    const events: StreamEvent[] = []
    await readEventStream('/ai/_ai/stream', { token: 't' }, (event) => events.push(event))

    expect(events.map((event) => event.event)).toEqual(['delta', 'done'])
    expect(fetchMock.mock.calls[0]![1].headers['X-XSRF-TOKEN']).toBe('abc')
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ token: 't' })
  })

  it('treats a JSON answer as done and rejects error statuses', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ text: 'whole' })))
        .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'No' }), { status: 403 })),
    )

    const events: StreamEvent[] = []
    await readEventStream('/s', {}, (event) => events.push(event))

    expect(events).toEqual([{ event: 'done', data: { text: 'whole' } }])
    await expect(readEventStream('/s', {}, () => undefined)).rejects.toMatchObject({ status: 403 })
  })
})

describe('StreamAnnouncer', () => {
  it('announces whole words in throttled batches, then the rest', () => {
    let time = 0
    const announcer = new StreamAnnouncer(1000, () => time)

    time = 1000
    expect(announcer.next('The quick bro')).toBe('The quick')
    time = 1500
    expect(announcer.next('The quick brown fox')).toBeNull()
    time = 2000
    expect(announcer.next('The quick brown fox jum')).toBe('brown fox')
    expect(announcer.flush('The quick brown fox jumps.')).toBe('jumps.')
  })
})

describe('AiStreamController', () => {
  it('shows the text as it arrives and hands over the finished answer', async () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    const controller = new AiStreamController({
      endpoint: '/ai/_ai/stream',
      onDone,
      renderInterval: 10,
      read: fakeRead([
        { event: 'delta', data: { text: 'Hello ' } },
        { event: 'delta', data: { text: 'world' } },
        { event: 'done', data: { text: 'Hello world.' } },
      ]),
    })

    await controller.start('token-1')

    expect(onDone).toHaveBeenCalledWith('Hello world.')
    expect(controller.state.status).toBe('done')
    expect(controller.state.text).toBe('Hello world.')
    expect(controller.state.announcement).toBe('Hello world.')

    // The same token never streams twice.
    await controller.start('token-1')
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('reports errors and stops on cancel', async () => {
    const onError = vi.fn()
    const onCancel = vi.fn()
    let release!: () => void
    const pause = new Promise<void>((resolve) => (release = resolve))

    const failing = new AiStreamController({
      endpoint: '/s',
      onError,
      read: fakeRead([{ event: 'error', data: { message: 'Rate limited.' } }]),
    })
    await failing.start('a')
    expect(onError).toHaveBeenCalledWith('Rate limited.')
    expect(failing.state.status).toBe('error')

    const cancelled = new AiStreamController({
      endpoint: '/s',
      onCancel,
      read: fakeRead(
        [
          { event: 'delta', data: { text: 'Partial' } },
          { event: 'done', data: { text: 'Never' } },
        ],
        pause,
      ),
    })
    const running = cancelled.start('b')
    cancelled.cancel()
    release()
    await running

    expect(onCancel).toHaveBeenCalledOnce()
    expect(cancelled.state.status).toBe('cancelled')
  })
})

describe('CopilotController streaming', () => {
  const schema: AiCopilotSchema = {
    type: 'ai:copilot',
    key: 'ai-copilot',
    endpoints: {
      conversations: '/c',
      conversation: '/c/__ID__',
      send: '/m',
      stream: '/m/stream',
      confirm: '/a/__ID__/confirm',
      reject: '/a/__ID__/reject',
      delete: '/c/__ID__',
    },
    placeholder: '__ID__',
  }

  it('streams the answer, then keeps the stored messages', async () => {
    const seen: string[] = []
    const copilot = new CopilotController(schema, {
      storage: null,
      stream: async (url, body, onEvent) => {
        expect(url).toBe('/m/stream')
        expect(body.message).toBe('How many?')
        onEvent({ event: 'delta', data: { text: 'Two ' } })
        seen.push(copilot.state.streaming?.text ?? '')
        onEvent({ event: 'delta', data: { text: 'orders.' } })
        seen.push(copilot.state.streaming?.text ?? '')
        onEvent({
          event: 'done',
          data: {
            conversation: { id: 5, title: 'How many?' },
            messages: [
              { id: 1, role: 'user', content: 'How many?' },
              { id: 2, role: 'assistant', content: 'Two orders.' },
            ],
          },
        })
      },
    })

    await copilot.send('How many?')

    expect(seen).toEqual(['Two ', 'Two orders.'])
    expect(copilot.state.streaming).toBeNull()
    expect(copilot.state.messages.map((message) => message.content)).toEqual([
      'How many?',
      'Two orders.',
    ])
  })

  it('gives the question back when the stream reports an error', async () => {
    const copilot = new CopilotController(schema, {
      storage: null,
      stream: async (_url, _body, onEvent) => {
        onEvent({ event: 'error', data: { message: 'Too many questions.' } })
      },
    })

    await copilot.send()
    copilot.setDraft('Again?')
    await copilot.send()

    expect(copilot.state.error).toEqual({ message: 'Too many questions.' })
    expect(copilot.state.draft).toBe('Again?')
    expect(copilot.state.messages).toEqual([])
  })
})
