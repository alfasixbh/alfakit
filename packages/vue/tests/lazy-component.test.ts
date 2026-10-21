import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, onMounted, ref } from 'vue'
import { lazyComponent } from '../src/lib/lazy'

describe('lazyComponent', () => {
  // Spreadsheet mode lost its state (undo history, last save) on the first reload after its
  // code arrived: the async wrapper was swapped for the loaded component, a remount.
  it('keeps the same instance when the parent re-renders after the code loaded', async () => {
    let mounts = 0
    const Loaded = defineComponent({
      props: { label: { type: String, default: '' } },
      setup(props) {
        onMounted(() => mounts++)

        return () => h('p', { 'data-testid': 'loaded' }, props.label)
      },
    })
    const Lazy = lazyComponent(
      'Lazy',
      async () => Loaded,
      defineComponent(() => () => h('span', 'loading')),
    )
    const label = ref('one')
    const wrapper = mount(defineComponent(() => () => h(Lazy, { label: label.value })))

    await flushPromises()
    await flushPromises()
    expect(wrapper.find('[data-testid="loaded"]').text()).toBe('one')
    expect(mounts).toBe(1)

    label.value = 'two'
    await flushPromises()

    expect(wrapper.find('[data-testid="loaded"]').text()).toBe('two')
    expect(mounts).toBe(1)
  })
})
