import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionRunner } from '../src/actions'
import {
  ConflictMonitor,
  currentRecordVersion,
  findPageFormBlock,
  registerConflictForm,
  reportSaveConflict,
  setRecordVersion,
} from '../src/conflicts'
import { FormStore } from '../src/form'
import { router } from '../src/http'
import { LiveUpdates } from '../src/live'
import { PresenceRoom, presenceInitials, visiblePresenceMembers } from '../src/presence'
import {
  acquireChannel,
  configureRealtime,
  getEcho,
  listenForRecordChanges,
  realtimeHeaders,
  resetRealtime,
  resolveEcho,
  type EchoLike,
} from '../src/realtime'

type Callback = (payload: unknown) => void

/** A Laravel Echo stand-in: records channels and lets tests emit events. */
function fakeEcho(socket = '123.456') {
  const listeners = new Map<string, Map<string, Set<Callback>>>()
  const presence = new Map<string, Record<string, Callback | undefined>>()
  const left: string[] = []
  const whispers: Array<{ channel: string; event: string; data: unknown }> = []

  const on = (channel: string, event: string, callback: Callback) => {
    const events = listeners.get(channel) ?? new Map<string, Set<Callback>>()
    const set = events.get(event) ?? new Set<Callback>()
    set.add(callback)
    events.set(event, set)
    listeners.set(channel, events)
  }

  const channel = (name: string) => ({
    notification: (callback: Callback) => on(name, 'notification', callback),
    listen: (event: string, callback: Callback) => on(name, event, callback),
    stopListening: (event: string, callback?: Callback) => {
      if (callback) listeners.get(name)?.get(event)?.delete(callback)
    },
  })

  const echo: EchoLike = {
    private: (name) => channel(`private-${name}`),
    join: (name) => {
      const handlers: Record<string, Callback | undefined> = {}
      presence.set(name, handlers)

      return {
        ...channel(`presence-${name}`),
        here: (callback) => (handlers.here = callback as Callback),
        joining: (callback) => (handlers.joining = callback as Callback),
        leaving: (callback) => (handlers.leaving = callback as Callback),
        whisper: (event, data) => whispers.push({ channel: name, event, data }),
        listenForWhisper: (event, callback) =>
          on(`presence-${name}`, `whisper:${event}`, callback as Callback),
      }
    },
    leave: (name) => left.push(name),
    socketId: () => socket,
  }

  const emit = (channelName: string, event: string, payload: unknown) =>
    listeners
      .get(channelName)
      ?.get(event)
      ?.forEach((callback) => callback(payload))

  return { echo, emit, presence, left, whispers, listeners }
}

beforeEach(() => resetRealtime())

afterEach(() => {
  delete (window as unknown as { Echo?: unknown }).Echo
  vi.useRealTimers()
  vi.restoreAllMocks()
  setRecordVersion(null)
})

describe('Echo connection', () => {
  it('prefers window.Echo, then the createAlfakit factory, then the optional packages', async () => {
    const { echo } = fakeEcho()
    const factory = vi.fn(() => echo)

    configureRealtime(
      {
        channel: 'App.Models.User.1',
        live: true,
        authEndpoint: '/admin/_alfakit/broadcasting/auth',
      },
      { echo: factory, csrfToken: 'csrf' },
    )

    await expect(resolveEcho()).resolves.toBe(echo)
    expect(factory).toHaveBeenCalledWith({
      authEndpoint: '/admin/_alfakit/broadcasting/auth',
      csrfToken: 'csrf',
    })
    expect(realtimeHeaders()).toEqual({ 'X-Socket-ID': '123.456' })

    const own = fakeEcho('9.9').echo
    ;(window as unknown as { Echo?: unknown }).Echo = own

    expect(getEcho()).toBe(own)
  })

  it('creates Echo from laravel-echo and pusher-js when the app installed them', async () => {
    const created: Array<Record<string, unknown>> = []

    class Echo {
      constructor(options: Record<string, unknown>) {
        created.push(options)
      }

      private() {
        return { notification: () => {} }
      }
    }

    const loader = vi.fn(async (name: string) =>
      name === 'laravel-echo' ? { default: Echo } : { default: 'Pusher' },
    )

    resetRealtime({ loader })
    configureRealtime({
      channel: 'u',
      live: true,
      authEndpoint: '/auth',
      echo: { key: 'k', wsHost: 'ws.test' },
    })

    const echo = await resolveEcho()

    expect(echo).toBeInstanceOf(Echo)
    expect(loader).toHaveBeenCalledWith('laravel-echo')
    expect(created[0]).toMatchObject({
      broadcaster: 'reverb',
      key: 'k',
      wsHost: 'ws.test',
      authEndpoint: '/auth',
      Pusher: 'Pusher',
    })
  })

  it('works without Echo: missing packages resolve to null', async () => {
    resetRealtime({ loader: () => Promise.reject(new Error('Cannot find module laravel-echo')) })
    configureRealtime({ channel: 'u', live: true, echo: { key: 'k' } })

    await expect(resolveEcho()).resolves.toBeNull()
    expect(realtimeHeaders()).toEqual({})
    expect(listenForRecordChanges('alfakit.admin._.Post', vi.fn())).toBeTypeOf('function')
  })

  it('leaves a shared channel only when its last user releases it', () => {
    const { echo, left } = fakeEcho()
    const a = acquireChannel(echo, 'presence', 'alfakit.admin._.Post.1')!
    const b = acquireChannel(echo, 'presence', 'alfakit.admin._.Post.1')!

    a.release()
    a.release()
    expect(left).toEqual([])

    b.release()
    expect(left).toEqual(['alfakit.admin._.Post.1'])
  })

  it('delivers record changes with keys only', () => {
    const { echo, emit } = fakeEcho()
    const callback = vi.fn()
    const stop = listenForRecordChanges('alfakit.admin._.Post', callback, { echo })

    emit('private-alfakit.admin._.Post', '.alfakit.record', {
      event: 'updated',
      model: 'App-Models-Post',
      key: 5,
      by: 2,
      at: 10,
    })
    emit('private-alfakit.admin._.Post', '.alfakit.record', { event: 'bogus', key: 5 })
    stop()
    emit('private-alfakit.admin._.Post', '.alfakit.record', { event: 'deleted', key: 5 })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith({
      event: 'updated',
      model: 'App-Models-Post',
      key: 5,
      by: 2,
      at: 10,
    })
  })
})

describe('PresenceRoom', () => {
  it('lists the other users on the record with their editing state', () => {
    const { echo, presence, emit, whispers } = fakeEcho()
    const room = new PresenceRoom({
      channel: 'alfakit.admin._.Post.1',
      state: 'editing',
      self: 1,
      echo,
    })
    const stop = room.start()
    const handlers = presence.get('alfakit.admin._.Post.1')!

    handlers.here!([
      { id: 1, name: 'Me' },
      { id: 2, name: 'Dana Scully', avatar: '/dana.png' },
    ])

    expect(room.members).toEqual([
      { id: 2, name: 'Dana Scully', avatar: '/dana.png', state: 'viewing' },
    ])
    expect(whispers.at(-1)).toMatchObject({
      event: 'alfakit-presence',
      data: { id: 1, state: 'editing' },
    })

    handlers.joining!({ id: 3, name: 'Fox' })
    emit('presence-alfakit.admin._.Post.1', 'whisper:alfakit-presence', { id: 3, state: 'editing' })
    handlers.leaving!({ id: 2, name: 'Dana Scully' })

    expect(room.members).toEqual([{ id: 3, name: 'Fox', avatar: null, state: 'editing' }])

    stop()
    expect(room.store.get()).toEqual({ members: [], connected: false })
  })

  it('formats initials and caps the avatars shown', () => {
    expect(presenceInitials('dana scully')).toBe('DS')
    expect(presenceInitials('Ömer')).toBe('ÖM')

    const members = [1, 2, 3, 4, 5, 6].map((id) => ({
      id,
      name: `U${id}`,
      state: 'viewing' as const,
    }))

    expect(visiblePresenceMembers(members, 4).overflow).toBe(2)
  })
})

describe('ConflictMonitor', () => {
  const block = {
    type: 'Form' as const,
    key: 'form',
    component: 'form',
    components: [],
    state: { title: 'Old' },
    actions: [],
  }

  it('shows a conflict when another user saves, then reviews and keeps mine', async () => {
    const { echo, emit } = fakeEcho()
    const form = new FormStore(block, { token: 't', component: 'form' })
    const unregister = registerConflictForm(form)
    form.setValue('title', 'Mine')

    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          version: 'v2',
          fields: [
            {
              path: 'title',
              label: 'Title',
              theirs: 'Theirs',
              mine: 'Mine',
              value: 'Theirs',
              conflicting: true,
            },
          ],
        }),
      ),
    )

    const monitor = new ConflictMonitor({
      version: 'v1',
      token: 't',
      endpoint: '/admin/_alfakit/conflicts',
      channel: 'alfakit.admin._.Post.1',
      original: block.state,
      self: 1,
      resolveName: (id) => (id === 2 ? 'Dana' : null),
      echo,
    })
    const stop = monitor.start()

    expect(currentRecordVersion()).toBe('v1')

    emit('presence-alfakit.admin._.Post.1', '.alfakit.record', {
      event: 'updated',
      key: 1,
      by: 2,
      at: 1000,
    })

    expect(monitor.state.conflict).toEqual({
      source: 'broadcast',
      event: 'updated',
      by: 2,
      name: 'Dana',
      at: 1000,
    })

    await monitor.review()

    const [, init] = fetch.mock.calls[0]!
    expect(JSON.parse(String(init?.body))).toEqual({
      token: 't',
      original: { title: 'Old' },
      state: { title: 'Mine' },
    })
    expect(monitor.state.fields?.[0]).toMatchObject({
      label: 'Title',
      theirs: 'Theirs',
      mine: 'Mine',
    })

    await monitor.keepMine()

    expect(currentRecordVersion()).toBe('v2')
    expect(monitor.state.conflict).toBeNull()

    stop()
    unregister()
  })

  it('adopts saved values per field, shows refused saves and ignores its own save', () => {
    const form = new FormStore(block, { token: 't', component: 'form' })
    const unregister = registerConflictForm(form)
    const monitor = new ConflictMonitor({ version: 'v1', token: 't', self: 1, now: () => 5000 })
    const stop = monitor.start()

    reportSaveConflict()
    expect(monitor.state.conflict).toMatchObject({ source: 'save', by: null, name: null })

    monitor.store.update({
      fields: [
        {
          path: 'title',
          label: 'Title',
          theirs: 'Theirs',
          mine: 'Old',
          value: 'Theirs',
          conflicting: false,
        },
      ],
    })
    monitor.useTheirs('title')

    expect(form.state.values.title).toBe('Theirs')
    expect(monitor.state.fields).toEqual([])

    monitor.dismiss()
    monitor.onChange({ event: 'created', model: 'M', key: 1 })
    expect(monitor.state.conflict).toBeNull()

    stop()
    expect(currentRecordVersion()).toBeNull()
    unregister()
  })

  it('sends the record version with page actions and reports refused saves', () => {
    const post = vi.spyOn(router, 'post').mockImplementation(((
      _url: string,
      _data: unknown,
      options: { onError?: (errors: unknown) => void },
    ) => {
      options.onError?.({ alfakitConflict: 'Changed meanwhile' })
    }) as never)
    const monitor = new ConflictMonitor({ version: 'v1', token: 't' })
    const stop = monitor.start()
    const runner = new ActionRunner({ endpoints: { action: '/a', modal: '/m' } })

    runner.execute(
      { type: 'Action', name: 'save', hasAction: true },
      { token: 't', component: 'page' },
      { title: 'x' },
    )

    expect(post.mock.calls[0]![1]).toMatchObject({ recordVersion: 'v1', action: 'save' })
    expect(monitor.state.conflict?.source).toBe('save')

    // Table actions don't carry it.
    runner.execute(
      { type: 'Action', name: 'delete', hasAction: true },
      { token: 't', component: 'table', record: 1 },
    )
    expect(post.mock.calls[1]![1]).not.toHaveProperty('recordVersion')

    stop()
  })

  it('finds the page form block', () => {
    expect(findPageFormBlock({ content: [{ type: 'Table', key: 'table' }, block] as never })).toBe(
      block,
    )
    expect(findPageFormBlock({ content: [] })).toBeNull()
  })
})

describe('LiveUpdates', () => {
  it('refreshes once per burst, skips records not shown and counts created records', async () => {
    vi.useFakeTimers()
    const { echo, emit } = fakeEcho()
    const refresh = vi.fn()
    const live = new LiveUpdates({
      live: { channels: ['alfakit.admin._.Post'], debounce: 300, newRecordsIndicator: true },
      target: 'table',
      isShown: (key) => key === 1 || key === 2,
      refresh,
      echo,
    })
    const stop = live.start()
    const send = (event: string, key: number) =>
      emit('private-alfakit.admin._.Post', '.alfakit.record', { event, key, model: 'Post' })

    send('updated', 1)
    send('deleted', 2)
    send('updated', 99)
    vi.advanceTimersByTime(299)
    expect(refresh).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(refresh).toHaveBeenCalledWith(['table'])

    send('created', 3)
    send('created', 4)
    expect(live.pending).toBe(2)
    expect(live.store.get().connected).toBe(true)

    await live.showPending()
    expect(live.pending).toBe(0)
    expect(refresh).toHaveBeenCalledTimes(2)

    send('updated', 99)
    vi.advanceTimersByTime(1000)
    expect(refresh).toHaveBeenCalledTimes(2)

    stop()
  })

  it('falls back to polling without channels or Echo', async () => {
    const poll = vi.fn(() => () => {})

    new LiveUpdates({
      live: { channels: [], fallbackPollingInterval: '30s' },
      target: 'widget:stats',
      poll,
    }).start()
    expect(poll).toHaveBeenCalledWith('widget:stats', '30s')

    // A table that polls on its own doesn't poll twice.
    new LiveUpdates({
      live: { channels: [], fallbackPollingInterval: '30s' },
      target: 'table',
      polling: true,
      poll,
    }).start()
    expect(poll).toHaveBeenCalledTimes(1)

    new LiveUpdates({
      live: { channels: ['c'], fallbackPollingInterval: '10s' },
      target: 'table',
      poll,
      echo: null,
    }).start()
    expect(poll).toHaveBeenLastCalledWith('table', '10s')
  })
})
