import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotificationCenter } from '../src/notifications'

function respond(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
}

const note = (id: string) => ({ id, title: id, format: 'alfakit' as const })

describe('NotificationCenter.loadMore', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('appends the next page and keeps it when polling refreshes the first page', async () => {
    const fetch = vi
      .fn()
      .mockImplementationOnce(() =>
        respond({ notifications: [note('a'), note('b')], unreadCount: 3, hasMore: true, page: 1 }),
      )
      .mockImplementationOnce(() =>
        respond({ notifications: [note('b'), note('c')], unreadCount: 3, hasMore: false, page: 2 }),
      )
      .mockImplementationOnce(() =>
        respond({ notifications: [note('z'), note('a')], unreadCount: 4, hasMore: true, page: 1 }),
      )
    vi.stubGlobal('fetch', fetch)

    const center = new NotificationCenter({
      notifications: '/n',
      notificationsReadAll: '/n/read',
      notificationsDestroyAll: '/n',
    })

    await center.load()
    await center.loadMore()

    expect(String(fetch.mock.calls[1]![0])).toBe('/n?page=2')
    expect(center.store.get().notifications.map((n) => n.id)).toEqual(['a', 'b', 'c'])
    expect(center.store.get().hasMore).toBe(false)

    // Nothing more to load.
    await center.loadMore()
    expect(fetch).toHaveBeenCalledTimes(2)

    await center.load()
    expect(center.store.get().notifications.map((n) => n.id)).toEqual(['z', 'a', 'b', 'c'])
    expect(center.store.get().unreadCount).toBe(4)
  })
})
