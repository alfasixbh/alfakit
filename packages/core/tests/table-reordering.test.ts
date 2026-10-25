import type * as Http from '../src/http'
import {
  buildTableUrl,
  reorderTable,
  reorderingListsAllRecords,
  startTableReordering,
  stopTableReordering,
} from '../src/table'

const visits: string[] = []
const reloads: unknown[] = []
const posts: unknown[] = []

vi.mock('../src/http', async (importOriginal) => {
  const original = await importOriginal<typeof Http>()

  return {
    ...original,
    requestJson: async (_url: string, options: { body?: unknown } = {}) => {
      posts.push(options.body)

      return { ok: true }
    },
    inertiaReload: (options: unknown) => {
      reloads.push(options)
    },
    inertiaVisit: (url: string) => {
      visits.push(url)
    },
  }
})

const pagination = { currentPage: 2, lastPage: 3, perPage: 10, total: 25, from: 11, to: 20 }

beforeEach(() => {
  visits.length = 0
  reloads.length = 0
  posts.length = 0
  window.history.replaceState(null, '', '/admin/posts?page=2')
})

describe('reorder mode', () => {
  it('writes and removes the reordering key', () => {
    expect(buildTableUrl('/x?page=2', 'posts', { reordering: true })).toBe(
      '/x?page=2&posts_reordering=1',
    )
    expect(buildTableUrl('/x?reordering=1', undefined, { reordering: null })).toBe('/x')
  })

  it('lists every record of a paginated table unless paginatedWhileReordering()', () => {
    expect(reorderingListsAllRecords({ pagination })).toBe(true)
    expect(reorderingListsAllRecords({ pagination, paginatedWhileReordering: true })).toBe(false)
    expect(reorderingListsAllRecords({})).toBe(false)
  })

  it('reloads the table without pages when reordering starts and with them when it stops', () => {
    startTableReordering({ identifier: undefined, pagination })
    expect(visits).toEqual(['/admin/posts?reordering=1'])

    startTableReordering({ identifier: undefined, pagination, paginatedWhileReordering: true })
    stopTableReordering({ identifier: undefined })
    expect(visits).toHaveLength(1)

    window.history.replaceState(null, '', '/admin/posts?reordering=1')
    stopTableReordering({ identifier: undefined, reordering: true })
    expect(visits[1]).toBe('/admin/posts')
  })

  it('can save an order without reloading the page', async () => {
    const endpoints = { reorder: '/re', cell: '/c' }

    await reorderTable(endpoints, 't', 'table', [2, 1], { reload: false })
    expect(posts).toEqual([
      expect.objectContaining({ token: 't', component: 'table', order: [2, 1] }),
    ])
    expect(reloads).toHaveLength(0)

    await reorderTable(endpoints, 't', 'table', [1, 2])
    expect(reloads).toHaveLength(1)
  })
})
