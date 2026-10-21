import { mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { useHydrated } from '../src/composables/use-hydrated'

const Probe = defineComponent({
  setup() {
    const hydrated = useHydrated()

    return () => h('span', { 'data-testid': 'hydrated' }, String(hydrated.value))
  },
})

describe('useHydrated()', () => {
  it('is a ref that is false in server markup and true once mounted', async () => {
    expect(await renderToString(createSSRApp(Probe))).toContain('>false<')

    const wrapper = mount(Probe)
    await nextTick()
    expect(wrapper.text()).toBe('true')
  })
})
