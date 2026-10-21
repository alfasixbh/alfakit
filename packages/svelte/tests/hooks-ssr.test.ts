// @vitest-environment node
import { createStore } from '@alfakit/core'
import type { Page } from '@inertiajs/core'
import { render } from 'svelte/server'
import login from '../../core/tests/fixtures/ssr/login.json'
import { createAlfakitServer } from '../src/server'
import HooksHarness from './HooksHarness.svelte'

vi.unmock('@inertiajs/svelte')

describe('hooks on the server', () => {
  it('useHydrated() is false and useStore() reads .current while rendering on the server', () => {
    const { body } = render(HooksHarness, { props: { store: createStore({ count: 3 }) } })

    expect(body).toContain('>false<')
    expect(body).toContain('>3<')
  })

  it('createAlfakitServer({ withApp }) receives the context map for server renders', async () => {
    const seen: unknown[] = []
    const server = createAlfakitServer({
      withApp: (context, alfakit) => {
        seen.push(context instanceof Map, typeof alfakit.registry)
        context.set('qa', true)
      },
    })

    const result = await server(login as unknown as Page)

    expect(result?.body).toContain('data-server-rendered')
    expect(seen.slice(0, 2)).toEqual([true, 'object'])
  })
})
