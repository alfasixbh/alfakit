import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { discoverComponents } from '../src/lib/discovery'

const Wheel = defineComponent({
  props: { component: { type: Object, required: true } },
  setup: (props) => () => h('p', `wheel ${(props.component as { label: string }).label}`),
})

describe('discoverComponents', () => {
  it('registers files under keys derived from their path', () => {
    const loader = () => Promise.resolve({ default: Wheel })
    const discovered = discoverComponents({
      './fields/ColorWheel.vue': loader,
      './columns/ProgressBar.vue': loader,
      './blocks/pricing.vue': loader,
      './pages/Settings.vue': loader,
      './fields/_Base.vue': loader,
    })

    expect(Object.keys(discovered.components).sort()).toEqual([
      'ColorWheel',
      'cms:block:pricing',
      'column:ProgressBar',
    ])
    expect(Object.keys(discovered.pages)).toEqual(['Pages/Settings'])
  })

  it('loads a lazy component only when it renders', async () => {
    const loader = vi.fn(() => Promise.resolve({ default: Wheel }))
    const { components } = discoverComponents({ './fields/ColorWheel.vue': loader })

    expect(loader).not.toHaveBeenCalled()

    const wrapper = mount(components.ColorWheel!, { props: { component: { label: 'Hue' } } })

    expect(loader).toHaveBeenCalledTimes(1)
    await flushPromises()
    expect(wrapper.text()).toBe('wheel Hue')
  })

  it('renders preloaded and eager components synchronously', async () => {
    const { components, discovery } = discoverComponents({
      './fields/ColorWheel.vue': () => Promise.resolve({ default: Wheel }),
      './entries/Eager.vue': { default: Wheel },
    })

    await discovery.preloadFor({ props: { field: { type: 'ColorWheel' } } })

    // No flushPromises(): both render on the first pass.
    expect(mount(components.ColorWheel!, { props: { component: { label: 'one' } } }).text()).toBe(
      'wheel one',
    )
    expect(mount(components.Eager!, { props: { component: { label: 'two' } } }).text()).toBe(
      'wheel two',
    )
  })

  it('warns when two files claim the same key', () => {
    const warn = vi.fn()

    discoverComponents(
      {
        './fields/ColorWheel.vue': { default: Wheel },
        './fields/shop/ColorWheel.vue': { default: Wheel },
      },
      { warn },
    )

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('both auto-register the component "ColorWheel"'),
    )
  })
})
