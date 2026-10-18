import type { PageSchema, StandaloneComponentSchema } from '../src'
import {
  StandaloneComponentState,
  findStandalonePropName,
  isStandaloneComponent,
  registerStandaloneProp,
  resolvePartialProps,
  standalonePageSchema,
  standalonePanelSchema,
} from '../src'
import contactForm from './fixtures/standalone/contact-form.json'
import postsTable from './fixtures/standalone/posts-table.json'

const form = contactForm as unknown as StandaloneComponentSchema
const table = postsTable as unknown as StandaloneComponentSchema

describe('standalone payloads', () => {
  it('recognises payloads and finds the prop holding one', () => {
    expect(isStandaloneComponent(form)).toBe(true)
    expect(isStandaloneComponent({ token: 'x' })).toBe(false)
    expect(isStandaloneComponent(null)).toBe(false)

    const props = { auth: { user: null }, form, posts: table, nested: { inner: form } }
    expect(findStandalonePropName(props, form)).toBe('form')
    expect(findStandalonePropName(props, table)).toBe('posts')
    expect(findStandalonePropName(props, { token: 'other' })).toBeUndefined()
    expect(findStandalonePropName(undefined, form)).toBeUndefined()
  })

  it('shapes the panel and page the renderer hooks expect', () => {
    const panel = standalonePanelSchema(form)
    expect(panel.id).toBe('standalone')
    expect(panel.endpoints.action).toBe(form.endpoints.action)
    expect(panel.endpoints.components).toBe(form.endpoints.components)
    expect(panel.localization.direction).toBe('ltr')
    expect(panel.translations).toBe(form.translations)
    expect(panel.navigation).toEqual([])

    const page = standalonePageSchema(form)
    expect(page.class).toBe(form.class)
    expect(page.token).toBe(form.token)
    expect(page.heading).toBe('Contact us')
    expect(page.content).toBe(form.content)
    expect(page.layout).toBe('blank')
  })
})

describe('partial reload props', () => {
  it('leaves reloads alone without standalone components', () => {
    expect(resolvePartialProps(['page'])).toEqual(['page'])
    expect(resolvePartialProps(undefined)).toBeUndefined()
  })

  it('replaces the panel page prop with the standalone props on the page', () => {
    const offForm = registerStandaloneProp('form')
    const offPosts = registerStandaloneProp('posts')

    expect(resolvePartialProps(['page'])).toEqual(['form', 'posts'])
    expect(resolvePartialProps(['alfakitPoll'])).toEqual(['alfakitPoll'])

    // A component nested in another prop cannot be requested alone: reload everything.
    const offNested = registerStandaloneProp(null)
    expect(resolvePartialProps(['page'])).toBeUndefined()
    offNested()

    expect(resolvePartialProps(['page'])).toEqual(['form', 'posts'])

    offForm()
    offPosts()
    expect(resolvePartialProps(['page'])).toEqual(['page'])
  })
})

describe('StandaloneComponentState', () => {
  const lazyWidget = {
    ...table,
    token: 'lazy-token',
    class: 'App\\Stats',
    lazy: ['widget:stats'],
    content: [
      {
        type: 'Widgets',
        key: 'headerWidgets',
        columns: { default: 1 },
        widgets: [
          { type: 'StatsOverviewWidget', key: 'stats', id: 'stats', columnSpan: {}, lazy: true },
        ],
      },
    ],
  } as unknown as StandaloneComponentSchema

  it('merges fetched schemas into the page and forgets them on a new payload', async () => {
    const fetched = vi.fn().mockResolvedValue({
      'widget:stats': {
        type: 'StatsOverviewWidget',
        key: 'stats',
        id: 'stats',
        columnSpan: {},
        stats: [],
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => fetched(),
        text: async () => JSON.stringify(await fetched()),
      })),
    )

    let changes = 0
    const state = new StandaloneComponentState(lazyWidget, () => changes++)

    const widgets = (page: PageSchema) =>
      (page.content[0] as { widgets: Array<{ lazy?: boolean }> }).widgets
    expect(widgets(state.page)[0]!.lazy).toBe(true)

    await state.loadLazy()

    expect(changes).toBe(1)
    expect(widgets(state.page)[0]!.lazy).toBeUndefined()
    expect(vi.mocked(fetch).mock.calls[0]![0]).toContain('targets=widget%3Astats')
    expect(vi.mocked(fetch).mock.calls[0]![0]).toContain('token=lazy-token')

    // The same payload again (preserved state) keeps what was loaded…
    state.setComponent({ ...lazyWidget })
    expect(widgets(state.page)[0]!.lazy).toBeUndefined()

    // …a new token (new response) starts from the server's placeholders, served from cache.
    state.setComponent({ ...lazyWidget, token: 'next-token' })
    expect(widgets(state.page)[0]!.lazy).toBeUndefined()

    vi.unstubAllGlobals()
  })
})
