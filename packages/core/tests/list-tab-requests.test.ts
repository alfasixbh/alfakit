import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionRunner } from '../src/actions'
import { fieldActionContext } from '../src/field-actions'
import { FormStore } from '../src/form'
import type { SchemaComponent } from '../src/schema/components'
import { reorderTable, updateTableCell } from '../src/table'

/*
 * W-V1-11 / W-V1-14: on a list tab other than the default one, requests that resolve a
 * record through the table (inline cell edits, reordering, the forms of a record action's
 * modal) must carry the page's query, or the server looks the record up in the default
 * tab and answers 404.
 */

const bodies: Record<string, unknown>[] = []

beforeEach(() => {
  bodies.length = 0
  window.history.replaceState(null, '', '/admin/posts?activeTab=drafts')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit = {}) => {
      bodies.push(JSON.parse(String(init.body ?? '{}')) as Record<string, unknown>)

      return new Response(JSON.stringify({ state: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

const endpoints = { cell: 'https://app.test/cell', reorder: 'https://app.test/reorder' }

describe('requests from a non-default list tab', () => {
  it('sends the active tab with an inline cell edit', async () => {
    await updateTableCell(endpoints, 't', 'table', 2, 'is_featured', true)

    expect(bodies[0]).toMatchObject({
      record: 2,
      column: 'is_featured',
      tableQuery: 'activeTab=drafts',
    })
  })

  it('sends the active tab with a reorder', async () => {
    await reorderTable(endpoints, 't', 'table', [2, 1], { reload: false })

    expect(bodies[0]).toMatchObject({ order: [2, 1], tableQuery: 'activeTab=drafts' })
  })

  it("sends the active tab with a record action modal's step validation", async () => {
    const components = [
      {
        type: 'TextInput',
        key: 'email',
        name: 'email',
        statePath: 'email',
        live: true,
      },
    ] as SchemaComponent[]
    const store = new FormStore(
      { components, state: { email: 'a@example.com' } },
      {
        token: 't',
        component: 'action:table.onboard',
        record: 2,
        validateUrl: 'https://app.test/validate',
        refreshUrl: 'https://app.test/refresh',
      },
    )

    expect(store.requestContext()).toMatchObject({ record: 2, tableQuery: 'activeTab=drafts' })

    await store.validateStep('account', ['email'])
    expect(bodies[0]).toMatchObject({ record: 2, step: 'account', tableQuery: 'activeTab=drafts' })
  })

  it('sends the active tab with a field action run inside a record action modal', async () => {
    const runner = new ActionRunner({
      endpoints: { action: 'https://app.test/actions', modal: 'https://app.test/modal' },
    })
    const context = fieldActionContext({
      token: 't',
      key: 'author_id',
      schema: 'action:table.onboard',
    })

    await runner.executeField(
      { type: 'Action', name: 'createOption', hasAction: true },
      context,
      {},
    )

    expect(bodies[0]).toMatchObject({ action: expect.any(String), tableQuery: 'activeTab=drafts' })
  })

  it('leaves tableQuery out on a page without a query string', () => {
    window.history.replaceState(null, '', '/admin/posts')
    const store = new FormStore({ components: [], state: {} }, { token: 't', component: 'form' })

    expect(store.requestContext().tableQuery).toBeUndefined()
  })
})
