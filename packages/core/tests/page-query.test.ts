import { afterEach, describe, expect, it, vi } from 'vitest'
import { ActionRunner } from '../src/actions'
import type * as Http from '../src/http'
import { currentPageQuery } from '../src/page-query'

const posted: Record<string, unknown>[] = []

vi.mock('../src/http', async (importOriginal) => {
  const original = await importOriginal<typeof Http>()

  return {
    ...original,
    inertiaPost: (_url: string, data: Record<string, unknown>) => {
      posted.push(data)
    },
  }
})

describe('page query string for table actions', () => {
  afterEach(() => {
    posted.length = 0
    window.history.replaceState(null, '', '/')
  })

  it('reads the query string without the question mark', () => {
    expect(currentPageQuery()).toBeUndefined()

    window.history.replaceState(
      null,
      '',
      '/admin/posts?search=ada&filters%5Bstatus%5D%5Bvalue%5D=draft',
    )

    expect(currentPageQuery()).toBe('search=ada&filters%5Bstatus%5D%5Bvalue%5D=draft')
  })

  it('sends the table state with action requests', () => {
    window.history.replaceState(null, '', '/admin/posts?sort=title&direction=desc')

    const runner = new ActionRunner({ endpoints: { action: '/actions', modal: '/modal' } })
    runner.execute({ type: 'Action', name: 'export' }, { token: 't', component: 'table' })

    expect(posted[0]).toMatchObject({ action: 'export', tableQuery: 'sort=title&direction=desc' })
  })
})
