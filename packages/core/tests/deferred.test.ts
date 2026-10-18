import { describe, expect, it, vi } from 'vitest'
import {
  deferredComponentReference,
  deferredHasErrors,
  isDeferredPlaceholder,
  loadDeferredBadge,
  loadDeferredComponent,
  mergeDeferredComponent,
  replaceComponentByKey,
  whenVisible,
} from '../src/deferred'
import { FormStore } from '../src/form'
import type * as Http from '../src/http'
import type { SchemaComponent } from '../src/schema/components'

const jsonCalls: { url: string; body: Record<string, unknown> }[] = []

vi.mock('../src/http', async (importOriginal) => {
  const original = await importOriginal<typeof Http>()

  return {
    ...original,
    requestJson: async (url: string, options: { body?: Record<string, unknown> } = {}) => {
      jsonCalls.push({ url, body: options.body ?? {} })

      return options.body?.only === 'badge'
        ? { badge: { badge: 3, badgeColor: 'danger' } }
        : {
            component: {
              type: 'Section',
              key: 'details',
              schema: [{ type: 'Text', key: 't', content: 'Hi' }],
            },
          }
    },
  }
})

const tree: SchemaComponent[] = [
  { type: 'TextInput', key: 'title' },
  {
    type: 'Group',
    key: 'group',
    schema: [
      { type: 'Section', key: 'details', deferred: true, deferredPaths: ['slug'], schema: [] },
    ],
  },
]

describe('deferred schemas', () => {
  it('recognises placeholders and builds references', () => {
    expect(isDeferredPlaceholder({ deferred: true })).toBe(true)
    expect(isDeferredPlaceholder({})).toBe(false)
    expect(isDeferredPlaceholder(null)).toBe(false)
    expect(deferredComponentReference('form', 'details')).toBe('form::details')
  })

  it('replaces a nested component by key and keeps identity when absent', () => {
    const replacement = { type: 'Section', key: 'details', schema: [] } as SchemaComponent
    const next = replaceComponentByKey(tree, 'details', replacement)

    expect(next).not.toBe(tree)
    expect(next[0]).toBe(tree[0])
    expect(next[1]!.schema![0]).toBe(replacement)
    expect(replaceComponentByKey(tree, 'missing', replacement)).toBe(tree)
  })

  it('loads early when a field inside has an error', () => {
    const placeholder = { deferredPaths: ['slug', 'address'] }

    expect(deferredHasErrors(placeholder, { slug: ['Required'] })).toBe(true)
    expect(deferredHasErrors(placeholder, { 'address.city': ['Required'] })).toBe(true)
    expect(deferredHasErrors(placeholder, { slugs: ['x'], title: ['x'] })).toBe(false)
    expect(deferredHasErrors({}, { slug: ['x'] })).toBe(false)
  })

  it('posts the form context and state, and merges the loaded component', async () => {
    const form = new FormStore(
      { components: tree, state: { title: 'A', slug: 'a' } },
      { token: 'tok', component: 'form' },
    )
    const component = await loadDeferredComponent({
      url: '/deferred',
      token: 'page',
      key: 'details',
      form,
    })

    expect(jsonCalls.at(-1)).toEqual({
      url: '/deferred',
      body: expect.objectContaining({
        token: 'tok',
        component: 'form::details',
        state: { title: 'A', slug: 'a' },
      }),
    })
    expect(mergeDeferredComponent(form, component)).toBe(true)
    expect(form.state.components[1]!.schema![0]!.schema![0]!.key).toBe('t')
    expect(mergeDeferredComponent(form, { type: 'X', key: 'nope' })).toBe(false)
  })

  it('loads a badge for infolists without a form', async () => {
    const badge = await loadDeferredBadge({
      url: '/deferred',
      token: 'page',
      key: 'meta',
      schema: 'infolist',
    })

    expect(badge).toEqual({ badge: 3, badgeColor: 'danger' })
    expect(jsonCalls.at(-1)!.body).toMatchObject({
      token: 'page',
      component: 'infolist::meta',
      only: 'badge',
    })
  })

  it('runs immediately without IntersectionObserver and waits for intersection with it', () => {
    const element = {} as Element
    const now = vi.fn()

    vi.stubGlobal('IntersectionObserver', undefined)
    whenVisible(element, now)
    expect(now).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()

    let trigger: (entries: { isIntersecting: boolean }[]) => void = () => {}
    const disconnect = vi.fn()

    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: typeof trigger) {
          trigger = callback
        }
        observe() {}
        disconnect = disconnect
      },
    )

    const later = vi.fn()
    whenVisible(element, later)
    trigger([{ isIntersecting: false }])
    expect(later).not.toHaveBeenCalled()
    trigger([{ isIntersecting: true }])
    expect(later).toHaveBeenCalledOnce()
    expect(disconnect).toHaveBeenCalled()
    expect(whenVisible(null, later)).toBeTypeOf('function')
    vi.unstubAllGlobals()
  })
})
