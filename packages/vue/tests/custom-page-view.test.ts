import { Translator, type AlfakitPageProps } from '@alfakit/core'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { ALFAKIT_KEY } from '../src/context'
import AlfakitPage from '../src/pages/AlfakitPage.vue'
import { actions, mountWithAlfakit, panel, registry, setPageProps } from './mocks'

/*
 * W-V3-24: in a starter kit, `Alfakit/Page` renders a custom page component (`view`). The
 * component brings its own PageShell (one header, as in panel mode) and takes the live
 * props, so a partial reload (`reloadProps('items')`) reaches it.
 */
const Board = defineComponent({
  props: { items: { type: Array, default: () => [] }, page: { type: Object, required: true } },
  setup: (props) => () =>
    h(
      'ul',
      { 'data-test': 'board' },
      props.items.map((item) => h('li', String(item))),
    ),
})

const page = (items: string[]) =>
  ({
    title: 'Board',
    heading: 'Board',
    token: 't',
    content: [],
    view: { component: 'Board', props: { items } },
  }) as unknown as AlfakitPageProps['page']

afterEach(() => setPageProps({ alfakit: panel }))

describe('custom page components in Alfakit/Page', () => {
  it('renders the component without a second page shell and with the live props', async () => {
    // After `reloadProps('items')` the top-level prop is newer than the `page` snapshot.
    setPageProps({
      alfakit: { ...panel, starterKit: true },
      page: page(['One']),
      items: ['One', 'Two'],
    } as Partial<AlfakitPageProps>)

    const wrapper = mountWithAlfakit(() => h(AlfakitPage), {
      global: {
        provide: {
          [ALFAKIT_KEY as symbol]: {
            registry,
            pages: { Board },
            actions,
            translator: new Translator(panel.translations),
          },
        },
      },
    })
    await flushPromises()

    expect(wrapper.findAll('[data-slot="page-header"]')).toHaveLength(0)
    expect(wrapper.find('[data-test="board"]').text()).toBe('OneTwo')
    wrapper.unmount()
  })
})
