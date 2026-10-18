// @vitest-environment node
import type { Page } from '@inertiajs/core'
import postsCreate from '../../core/tests/fixtures/ssr/posts-create.json'
import { createAlfakitServer } from '../src/server'

vi.unmock('@inertiajs/react')

/** The create-post fixture with its slug field rendered by a custom `Swatch` type. */
function pageWithSwatch(): Page {
  const page = structuredClone(postsCreate) as unknown as Page

  return JSON.parse(
    JSON.stringify(page).replace('"type":"TextInput","key":"slug"', '"type":"Swatch","key":"slug"'),
  ) as Page
}

function Discovered({ component }: { component: { label: string } }) {
  return <output data-testid="swatch">{`discovered ${component.label}`}</output>
}

function Explicit() {
  return <output>explicit swatch</output>
}

describe('auto-registered components on the server', () => {
  it('loads the components a page uses before rendering it', async () => {
    const loader = vi.fn(() => Promise.resolve({ default: Discovered }))
    const render = createAlfakitServer({ discover: { './fields/Swatch.tsx': loader } })
    const html = (await render(pageWithSwatch()))?.body ?? ''

    expect(JSON.stringify(postsCreate)).toContain('"type":"TextInput","key":"slug"')
    expect(loader).toHaveBeenCalledTimes(1)
    expect(html).toContain('discovered Slug')
  })

  it('lets explicit components win over discovered files', async () => {
    const render = createAlfakitServer({
      discover: { './fields/Swatch.tsx': () => Promise.resolve({ default: Discovered }) },
      components: { Swatch: Explicit },
    })
    const html = (await render(pageWithSwatch()))?.body ?? ''

    expect(html).toContain('explicit swatch')
    expect(html).not.toContain('discovered Slug')
  })
})
