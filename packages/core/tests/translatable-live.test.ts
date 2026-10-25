import { afterEach, describe, expect, it, vi } from 'vitest'
import { FormStore } from '../src/form'
import type { SchemaComponent } from '../src/schema/components'

/*
 * W-V3-04: a translatable field's inputs write `title.en`; its `live()` must still refresh
 * the form, naming the field (`title`), so `afterStateUpdated()` runs on the server.
 */

const locales = [
  { code: 'en', tag: 'en', label: 'English', direction: 'ltr' },
  { code: 'ar', tag: 'ar', label: 'العربية', direction: 'rtl' },
]

const title = (live: Record<string, unknown>) =>
  ({
    type: 'TextInput',
    key: 'title',
    name: 'title',
    statePath: 'title',
    live,
    translatable: { locales, defaultLocale: 'en' },
  }) as unknown as SchemaComponent

function store(live: Record<string, unknown>) {
  const bodies: Array<Record<string, unknown>> = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>)

      return new Response(
        JSON.stringify({ components: [title(live)], state: { title: { en: 'Hi' }, slug: 'hi' } }),
        {
          status: 200,
        },
      )
    }),
  )

  return {
    bodies,
    form: new FormStore(
      { components: [title(live)], state: { title: { en: '', ar: '' }, slug: '' } },
      { token: 't', component: 'form', refreshUrl: 'https://app.test/refresh' },
    ),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('live translatable fields', () => {
  it('refreshes the field on blur with live(onBlur: true)', async () => {
    const { bodies, form } = store({ onBlur: true })

    form.setValue('title.en', 'Hi')
    form.blur('title.en')

    await vi.waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toMatchObject({ path: 'title', state: { title: { en: 'Hi', ar: '' } } })
  })

  it('refreshes the field after typing with live()', async () => {
    vi.useFakeTimers()
    const { bodies, form } = store({ debounce: 100 })

    form.setValue('title.ar', 'مرحبا')
    await vi.advanceTimersByTimeAsync(150)

    expect(bodies[0]).toMatchObject({ path: 'title' })
  })

  it('ignores a sub-path that is not one of its languages', async () => {
    const { bodies, form } = store({ onBlur: true })

    form.setValue('title.fr', 'x')
    form.blur('title.fr')
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(bodies).toHaveLength(0)
  })
})
