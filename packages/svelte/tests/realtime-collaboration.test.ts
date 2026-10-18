import {
  currentRecordVersion,
  resetRealtime,
  type PageSchema,
  type TableSchema,
} from '@alfakit/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import RecordPresence from '../src/components/realtime/RecordPresence.svelte'
import DataTable from '../src/components/table/DataTable.svelte'
import { panel, setPageProps } from './mocks'
import RealtimeHarness from './RealtimeHarness.svelte'
import Wrapper from './Wrapper.svelte'

type Callback = (payload: unknown) => void

/** Laravel Echo stand-in on `window.Echo`: one channel object per name, like Echo. */
function installEcho() {
  const listeners = new Map<string, Callback[]>()
  const presence = new Map<string, Record<string, Callback>>()
  const joined = new Map<string, unknown>()

  const channel = (name: string) => ({
    notification: () => {},
    listen: (event: string, callback: Callback) =>
      listeners.set(`${name}|${event}`, [...(listeners.get(`${name}|${event}`) ?? []), callback]),
    stopListening: () => {},
  })

  ;(window as unknown as { Echo: unknown }).Echo = {
    private: (name: string) => channel(`private-${name}`),
    join: (name: string) => {
      if (joined.has(name)) return joined.get(name)

      const handlers: Record<string, Callback> = {}
      presence.set(name, handlers)

      const joinedChannel = {
        ...channel(`presence-${name}`),
        here: (callback: Callback) => (handlers.here = callback),
        joining: (callback: Callback) => (handlers.joining = callback),
        leaving: (callback: Callback) => (handlers.leaving = callback),
        whisper: () => {},
        listenForWhisper: (event: string, callback: Callback) =>
          listeners.set(`presence-${name}|whisper:${event}`, [callback]),
      }
      joined.set(name, joinedChannel)

      return joinedChannel
    },
    leave: () => {},
    socketId: () => '1.2',
  }

  const emit = (name: string, event: string, payload: unknown) => {
    listeners.get(`${name}|${event}`)?.forEach((callback) => callback(payload))
    flushSync()
  }

  return { emit, presence }
}

const channel = 'alfakit.admin._.App-Models-Post.1'

beforeEach(() => {
  resetRealtime()
  setPageProps({
    alfakit: {
      ...panel,
      user: { id: 1, name: 'Me' },
      endpoints: { ...panel.endpoints, conflicts: '/admin/_alfakit/conflicts' },
    },
  })
})

afterEach(() => {
  delete (window as unknown as { Echo?: unknown }).Echo
  vi.restoreAllMocks()
})

describe('RecordPresence', () => {
  it('lists the other users on the record with their state for screen readers', () => {
    const { presence, emit } = installEcho()

    render(Wrapper, {
      props: { component: RecordPresence, props: { presence: { channel, state: 'editing' } } },
    })

    presence.get(channel)!.here!([
      { id: 1, name: 'Me' },
      { id: 2, name: 'Dana Scully', avatar: null },
    ])
    emit(`presence-${channel}`, 'whisper:alfakit-presence', { id: 2, state: 'editing' })

    const list = screen.getByRole('list', { name: 'Also on this record' })

    expect(list.querySelectorAll('li')).toHaveLength(1)
    expect(list).toHaveTextContent('Dana Scully is editing')
    expect(list.querySelector('[data-state="editing"]')).not.toBeNull()
    expect(list.closest('[data-slot="presence"]')).not.toBeNull()
  })
})

describe('ConflictBanner', () => {
  const page: PageSchema = {
    class: 'EditPost',
    layout: 'app',
    title: 'Edit',
    token: 'tok',
    content: [
      {
        type: 'Form',
        key: 'form',
        component: 'form',
        components: [],
        state: { title: 'Old' },
        actions: [],
      },
    ] as never,
    conflicts: { version: 'v1' },
    presence: { channel, state: 'editing' },
  }

  it('shows who saved, reviews the changes and keeps mine', async () => {
    const { presence, emit } = installEcho()
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

    render(Wrapper, { props: { component: RealtimeHarness, props: { page } } })

    presence.get(channel)!.here!([{ id: 2, name: 'Dana' }])
    emit(`presence-${channel}`, '.alfakit.record', {
      event: 'updated',
      key: 1,
      model: 'App-Models-Post',
      by: 2,
      at: Date.now() - 10_000,
    })

    const banner = screen.getByRole('status')

    expect(banner).toHaveAttribute('data-slot', 'conflict-banner')
    expect(banner).toHaveTextContent('Dana saved changes 10 seconds ago')

    await fireEvent.click(screen.getByRole('button', { name: 'Review changes' }))

    await waitFor(() => expect(screen.getByRole('table')).toHaveTextContent('Theirs'))
    expect(JSON.parse(String(fetch.mock.calls[0]![1]?.body))).toMatchObject({
      token: 'tok',
      original: { title: 'Old' },
    })
    expect(screen.getByRole('button', { name: 'Use the saved value of Title' })).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Keep mine' }))

    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(currentRecordVersion()).toBe('v2')
  })
})

describe('live tables', () => {
  const table: TableSchema = {
    type: 'Table',
    modelLabel: 'post',
    pluralModelLabel: 'posts',
    columns: [{ type: 'TextColumn', name: 'title', label: 'Title' }],
    visibleColumns: ['title'],
    filtersLayout: 'dropdown',
    recordActionsPosition: 'after-columns',
    records: [{ key: 1, cells: { title: { state: 'Hello' } } }],
    pagination: null,
    searchPlaceholder: 'Search',
    searchDebounce: 500,
    emptyState: { heading: 'No posts', icon: 'inbox' },
    live: { channels: ['alfakit.admin._.App-Models-Post'], newRecordsIndicator: true },
  }

  it('counts created records in a pill instead of jumping', () => {
    setPageProps({ page: { class: 'X', layout: 'app', title: 'Posts', content: [], token: 't' } })
    const { emit } = installEcho()

    render(Wrapper, { props: { component: DataTable, props: { table } } })

    for (const key of [5, 6, 7]) {
      emit('private-alfakit.admin._.App-Models-Post', '.alfakit.record', {
        event: 'created',
        key,
        model: 'App-Models-Post',
      })
    }

    expect(screen.getByRole('button', { name: '3 new records — show' })).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
