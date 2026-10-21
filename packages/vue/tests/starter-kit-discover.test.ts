import type { AlfakitPageProps, PageSchema } from '@alfakit/core'
import { mount } from '@vue/test-utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { defineComponent, h, type PropType } from 'vue'
import { useRegistry } from '../src/context'
import { AlfakitStarterKitRoot, createStarterKitPage } from '../src/starter-kit'
import { flush, panel, setPageProps } from './mocks'

// Its own file: the starter kit context is created once per browser session.

const RatingInput = defineComponent({
  props: { component: { type: Object as PropType<{ props: { label: string } }>, required: true } },
  setup: (props) => () => h('p', `rating ${props.component.props.label}`),
})

// What a schema renderer does with a field of type `RatingInput`.
const Field = defineComponent({
  setup() {
    const registry = useRegistry()

    return () => {
      const Custom = registry.resolve('RatingInput')

      return Custom ? h(Custom, { component: { props: { label: 'Stars' } } }) : h('p', 'missing')
    }
  },
})

const page = {
  title: 'Posts',
  token: 'token',
  content: [],
  breadcrumbs: [],
} as unknown as PageSchema

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
})

describe('starter kit mode: discover', () => {
  it('auto-registers the components in resources/js/alfakit, as createAlfakit({ discover }) does', async () => {
    setPageProps({ alfakit: { ...panel, starterKit: true }, page } as Partial<AlfakitPageProps>)
    const options = {
      layout: null,
      discover: {
        '../../alfakit/fields/RatingInput.vue': () => Promise.resolve({ default: RatingInput }),
      },
    }
    const Page = createStarterKitPage(options)

    const wrapper = mount(
      defineComponent({
        setup: () => () => h(AlfakitStarterKitRoot, { options }, () => [h(Page), h(Field)]),
      }),
    )

    for (let i = 0; i < 10 && !wrapper.text().includes('rating Stars'); i++) await flush()

    expect(wrapper.text()).toContain('rating Stars')
    expect(wrapper.text()).not.toContain('missing')
  })
})
