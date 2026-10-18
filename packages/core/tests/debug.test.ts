import { DebugRecorder, byteLength, debugRecorder, parseServerTiming } from '../src/debug'
import { FormStore } from '../src/form'
import { requestJson } from '../src/http'

describe('debug recorder', () => {
  afterEach(() => {
    debugRecorder.setEnabled(false)
    debugRecorder.clearRequests()
    vi.unstubAllGlobals()
  })

  it('parses the Server-Timing header and measures payload sizes', () => {
    expect(parseServerTiming('alfakit;dur=12.5')).toBe(12.5)
    expect(parseServerTiming('cache;desc="hit", alfakit;dur=3')).toBe(3)
    expect(parseServerTiming(null)).toBeNull()
    expect(parseServerTiming('alfakit')).toBeNull()

    expect(byteLength(null)).toBe(0)
    expect(byteLength('héllo')).toBe(6)
    expect(byteLength({ a: 1 })).toBe(7)
  })

  it('records nothing while disabled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"ok":true}', { status: 200 })),
    )

    await requestJson('/_alfakit/schema/options')

    expect(debugRecorder.store.get().requests).toEqual([])
    expect(debugRecorder.enabled).toBe(false)
  })

  it('captures internal requests with status, timing and sizes once enabled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{"rows":[1,2,3]}', {
            status: 200,
            headers: { 'Server-Timing': 'alfakit;dur=4.2' },
          }),
      ),
    )
    debugRecorder.setEnabled(true)

    await requestJson('/_alfakit/actions', { method: 'POST', body: { action: 'save' } })

    const [request] = debugRecorder.store.get().requests

    expect(request).toMatchObject({
      method: 'POST',
      url: '/_alfakit/actions',
      status: 200,
      serverDuration: 4.2,
      requestBytes: byteLength({ action: 'save' }),
      responseBytes: '{"rows":[1,2,3]}'.length,
      response: { rows: [1, 2, 3] },
      request: { action: 'save' },
    })
    expect(request!.duration).toBeGreaterThanOrEqual(0)
  })

  it('records failed responses and network errors, newest first', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"message":"Nope"}', { status: 422 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)
    debugRecorder.setEnabled(true)

    await expect(requestJson('/a')).rejects.toThrow('Nope')
    await expect(requestJson('/b')).rejects.toThrow('Failed to fetch')

    const requests = debugRecorder.store.get().requests

    expect(requests.map((request) => [request.url, request.status])).toEqual([
      ['/b', 0],
      ['/a', 422],
    ])
    expect(requests[0]!.response).toBe('Failed to fetch')
  })

  it('lists form stores while enabled and forgets them when destroyed', () => {
    const recorder = new DebugRecorder()
    const make = () =>
      new FormStore(
        { components: [], state: {} },
        { token: 't', component: 'form', refreshUrl: '/r' },
      )

    // The shared recorder is what FormStore talks to.
    const before = make()
    expect(debugRecorder.store.get().forms).not.toContain(before)

    debugRecorder.setEnabled(true)
    const form = make()
    expect(debugRecorder.store.get().forms).toContain(form)

    form.destroy()
    expect(debugRecorder.store.get().forms).not.toContain(form)

    recorder.registerForm(form)
    expect(recorder.store.get().forms).toEqual([])
  })

  it('caps the request log', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    )
    debugRecorder.setEnabled(true)

    for (let index = 0; index < 30; index++) {
      await requestJson(`/r/${index}`)
    }

    const requests = debugRecorder.store.get().requests

    expect(requests).toHaveLength(25)
    expect(requests[0]!.url).toBe('/r/29')
  })
})
