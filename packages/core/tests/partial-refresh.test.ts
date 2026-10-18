import { afterEach, describe, expect, it, vi } from 'vitest'
import { FormStore } from '../src/form'
import { applySchemaPatches, mergeRefreshResponse, mergeStatePatch } from '../src/partial'
import type { SchemaComponent } from '../src/schema/components'

const title = {
  type: 'TextInput',
  key: 'title',
  name: 'title',
  statePath: 'title',
  inputType: 'text',
  live: { onBlur: false, debounce: 0 },
} as SchemaComponent
const slug = {
  type: 'TextInput',
  key: 'slug',
  name: 'slug',
  statePath: 'slug',
  inputType: 'text',
} as SchemaComponent
const other = {
  type: 'TextInput',
  key: 'other',
  name: 'other',
  statePath: 'other',
  inputType: 'text',
} as SchemaComponent

const tree = (): SchemaComponent[] => [
  { type: 'Section', key: 'main', schema: [title, slug] },
  other,
]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('applySchemaPatches', () => {
  it('replaces only the patched component and keeps every other identity', () => {
    const components = tree()
    const patched = { ...slug, helperText: 'Changed' } as SchemaComponent
    const result = applySchemaPatches(components, [{ path: '0.1', component: patched }])

    expect(result).not.toBeNull()
    expect(result?.[0]).not.toBe(components[0])
    expect(result?.[0]?.schema?.[0]).toBe(title)
    expect(result?.[0]?.schema?.[1]).toBe(patched)
    expect(result?.[1]).toBe(other)
    // The original tree is untouched.
    expect(components[0]?.schema?.[1]).toBe(slug)
  })

  it('refuses patches that do not fit the tree', () => {
    expect(applySchemaPatches(tree(), [{ path: '0.5', component: slug }])).toBeNull()
    expect(applySchemaPatches(tree(), [{ path: '1', component: slug }])).toBeNull()
    expect(applySchemaPatches(tree(), [{ path: 'x', component: slug }])).toBeNull()
  })
})

describe('mergeStatePatch', () => {
  it('applies changed keys onto the state that was sent and drops removed ones', () => {
    expect(
      mergeStatePatch(
        { title: 'A', slug: 'a', secret: 'x' },
        {
          partial: true,
          patches: [],
          fingerprints: {},
          state: { slug: 'b' },
          partialState: true,
          removedState: ['secret'],
        },
      ),
    ).toEqual({ title: 'A', slug: 'b' })
  })

  it('treats an empty PHP array as an empty state', () => {
    expect(mergeStatePatch({ a: 1 }, { components: [], state: [] as never })).toEqual({})
    expect(
      mergeRefreshResponse(
        tree(),
        { a: 1 },
        {
          partial: true,
          patches: [],
          fingerprints: {},
          state: [],
          partialState: true,
        },
      )?.values,
    ).toEqual({ a: 1 })
  })
})

describe('FormStore partial refresh', () => {
  it('sends its fingerprints and patches the response into the tree', async () => {
    const bodies: Array<Record<string, unknown>> = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)

        return new Response(
          JSON.stringify({
            partial: true,
            patches: [{ path: '0.1', component: { ...slug, helperText: 'Slug for Hello' } }],
            fingerprints: { '': 'root', '0': 'b' },
            state: { slug: 'hello' },
            partialState: true,
            removedState: [],
          }),
          { status: 200 },
        )
      }),
    )

    const components = tree()
    const form = new FormStore(
      { components, state: { title: '', slug: null, other: 'o' }, fingerprints: { '': 'root' } },
      { token: 't', component: 'form', refreshUrl: '/refresh' },
    )

    form.setValue('title', 'Hello', { silent: true })
    await form.refresh('title')

    expect(bodies[0]?.fingerprints).toEqual({ '': 'root' })
    expect(form.state.values).toEqual({ title: 'Hello', slug: 'hello', other: 'o' })
    expect(form.state.components[1]).toBe(other)
    expect(form.state.components[0]?.schema?.[0]).toBe(title)
    expect((form.state.components[0]?.schema?.[1] as { helperText?: string }).helperText).toBe(
      'Slug for Hello',
    )
    expect(form.currentFingerprints).toEqual({ '': 'root', '0': 'b' })
  })

  it('falls back to a full refresh when patches do not fit', async () => {
    const bodies: Array<Record<string, unknown>> = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        bodies.push(body)

        const response = body.fingerprints
          ? {
              partial: true,
              patches: [{ path: '7', component: slug }],
              fingerprints: {},
              state: {},
            }
          : { components: [other], state: { other: 'full' } }

        return new Response(JSON.stringify(response), { status: 200 })
      }),
    )

    const form = new FormStore(
      { components: tree(), state: {}, fingerprints: { '': 'root' } },
      { token: 't', component: 'form', refreshUrl: '/refresh' },
    )

    await form.refresh('title')

    expect(bodies).toHaveLength(2)
    expect(bodies[1]?.fingerprints).toBeUndefined()
    expect(bodies[1]?.path).toBe('title')
    expect(form.state.components).toEqual([other])
    expect(form.state.values).toEqual({ other: 'full' })
  })

  it('sends extra request parameters with refreshes and option searches', async () => {
    const urls: string[] = []
    const bodies: Array<Record<string, unknown>> = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        urls.push(url)

        if (init?.body) bodies.push(JSON.parse(String(init.body)) as Record<string, unknown>)

        return new Response(JSON.stringify({ components: [], state: {}, options: [] }), {
          status: 200,
        })
      }),
    )

    const form = new FormStore(
      { components: [], state: {} },
      {
        token: 't',
        component: 'action:field:form::author_id.createOption',
        refreshUrl: '/refresh',
        optionsUrl: '/options',
        params: () => ({ ownerState: { author_id: 5 } }),
      },
    )

    await form.refresh()
    await form.searchOptions('team_id', 'a')

    expect(bodies[0]?.ownerState).toEqual({ author_id: 5 })
    const query = new URL(urls[1] ?? '', 'http://localhost').searchParams
    expect(JSON.parse(query.get('ownerState') ?? 'null')).toEqual({ author_id: 5 })
  })

  it('sends the state of GET requests as JSON so blank repeater items keep their place', async () => {
    const urls: string[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url)

        return new Response(JSON.stringify({ options: [], labels: {}, table: {} }), {
          status: 200,
        })
      }),
    )

    // The second line was just added in the browser: every value is still blank.
    const state = {
      items: [
        { product_id: '4', tags: [] },
        { product_id: null, tags: [] },
      ],
    }
    const form = new FormStore(
      { components: [], state },
      { token: 't', component: 'form', optionsUrl: '/options' },
    )

    await form.modalTable('items.1.product_id', 'table', { search: 'amber' })
    await form.searchOptions('items.1.product_id', 'a')
    await form.optionLabels('items.1.product_id', ['4'])

    for (const url of urls) {
      const query = new URL(url, 'http://localhost').searchParams

      expect(JSON.parse(query.get('state') ?? 'null')).toEqual(state)
      expect(query.get('path')).toBe('items.1.product_id')
    }

    expect(new URL(urls[0] ?? '', 'http://localhost').searchParams.get('table_search')).toBe(
      'amber',
    )
  })
})
