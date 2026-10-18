// @vitest-environment node
import type { Page } from '@inertiajs/core'
import { defineComponent, h } from 'vue'
import postsCreate from '../../core/tests/fixtures/ssr/posts-create.json'
import { createAlfakitServer } from '../src/server'

vi.unmock('@inertiajs/vue3')

/** The create-post fixture with its slug field rendered by a custom `Swatch` type. */
function pageWithSwatch(): Page {
  return JSON.parse(
    JSON.stringify(postsCreate).replace(
      '"type":"TextInput","key":"slug"',
      '"type":"Swatch","key":"slug"',
    ),
  ) as Page
}

const Discovered = defineComponent({
  props: { component: { type: Object, required: true } },
  setup: (props) => () => h('output', `discovered ${(props.component as { label: string }).label}`),
})

const Explicit = defineComponent({ setup: () => () => h('output', 'explicit swatch') })

describe('auto-registered components on the server', () => {
  it('loads the components a page uses before rendering it', async () => {
    const loader = vi.fn(() => Promise.resolve({ default: Discovered }))
    const render = createAlfakitServer({ discover: { './fields/Swatch.vue': loader } })
    const html = (await render(pageWithSwatch()))?.body ?? ''

    expect(loader).toHaveBeenCalledTimes(1)
    expect(html).toContain('discovered Slug')
  })

  it('lets explicit components win over discovered files', async () => {
    const render = createAlfakitServer({
      discover: { './fields/Swatch.vue': () => Promise.resolve({ default: Discovered }) },
      components: { Swatch: Explicit },
    })
    const html = (await render(pageWithSwatch()))?.body ?? ''

    expect(html).toContain('explicit swatch')
    expect(html).not.toContain('discovered Slug')
  })
})
