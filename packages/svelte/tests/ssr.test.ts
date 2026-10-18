// @vitest-environment node
import type { Page } from '@inertiajs/core'
import dashboard from '../../core/tests/fixtures/ssr/dashboard.json'
import kitchenSink from '../../core/tests/fixtures/ssr/kitchen-sink.json'
import login from '../../core/tests/fixtures/ssr/login.json'
import postsCreate from '../../core/tests/fixtures/ssr/posts-create.json'
import postsEdit from '../../core/tests/fixtures/ssr/posts-edit.json'
import postsIndex from '../../core/tests/fixtures/ssr/posts-index.json'
import { createAlfakitServer } from '../src/server'

// The SSR entry runs against the real Inertia adapter, not the test-suite mock.
vi.unmock('@inertiajs/svelte')

const render = createAlfakitServer()

async function body(fixture: unknown): Promise<string> {
  const result = await render(fixture as Page)

  if (!result) throw new Error('No SSR result')

  return result.body
}

describe('createAlfakitServer', () => {
  it('renders the login form on the server', async () => {
    const html = await body(login)

    expect(typeof window).toBe('undefined')
    expect(html).toContain('data-server-rendered="true"')
    expect(html).toContain('type="email"')
    expect(html).toContain('type="password"')
    expect(html).toContain('Sign in to your account')
  })

  it('renders the panel shell, navigation and a dashboard', async () => {
    const html = await body(dashboard)

    expect(html).toContain('data-slot="topbar"')
    expect(html).toContain('data-slot="content"')
    expect(html).toContain('href="http://localhost/admin/posts"')
  })

  it('renders a resource table', async () => {
    const html = await body(postsIndex)

    expect(html).toContain('<table')
    expect(html).toContain('data-slot="page-header"')
  })

  it('renders create and edit forms', async () => {
    expect(await body(postsCreate)).toContain('<form')
    expect(await body(postsEdit)).toContain('<form')
  })

  it('renders every built-in field, layout, entry and widget', async () => {
    const html = await body(kitchenSink)

    expect(html).toContain('Kitchen sink')
    expect(html).toContain('data-field="title"')
    expect(html).toContain('Placeholder content')
    expect(html).toContain('Some html')
    expect(html).toContain('1,024')
  })

  it('uses a fresh translator per request', async () => {
    const page = structuredClone(login) as unknown as Page<{
      alfakit: { translations: Record<string, unknown> }
    }>
    const form = page.props.alfakit.translations.form as Record<string, string>
    page.props.alfakit.translations.form = { ...form, show_password: 'Mot de passe visible' }

    expect(await body(page)).toContain('Mot de passe visible')
    expect(await body(login)).toContain('aria-label="Show password"')
  })

  it('leaves non-Alfakit pages to the browser or the fallback', async () => {
    const page = { component: 'Welcome', props: {}, url: '/', version: null } as unknown as Page

    expect(await render(page)).toBeNull()

    const withFallback = createAlfakitServer({
      fallback: async () => ({ head: [], body: '<div id="app">own</div>' }),
    })

    expect((await withFallback(page))?.body).toContain('own')
  })
})
