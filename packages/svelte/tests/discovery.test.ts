import { render, screen } from '@testing-library/svelte'
import { discoverComponents } from '../src/lib/discovery'
import Wheel from './DiscoveredWheel.svelte'

describe('discoverComponents', () => {
  it('registers files under keys derived from their path', () => {
    const loader = () => Promise.resolve({ default: Wheel })
    const discovered = discoverComponents({
      './fields/ColorWheel.svelte': loader,
      './columns/ProgressBar.svelte': loader,
      './blocks/pricing.svelte': loader,
      './pages/Settings.svelte': loader,
      './fields/ColorWheel.test.svelte': loader,
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
    const { components } = discoverComponents({ './fields/ColorWheel.svelte': loader })

    expect(loader).not.toHaveBeenCalled()

    render(components.ColorWheel!, { props: { component: { label: 'Hue' } } })

    expect(loader).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('wheel Hue')).toBeInTheDocument()
  })

  it('renders preloaded and eager components synchronously, with reactive props', async () => {
    const { components, discovery } = discoverComponents({
      './fields/ColorWheel.svelte': () => Promise.resolve({ default: Wheel }),
      './entries/Eager.svelte': { default: Wheel },
    })

    await discovery.preloadFor({ props: { field: { type: 'ColorWheel' } } })

    const { rerender } = render(components.ColorWheel!, {
      props: { component: { label: 'one' } },
    })
    render(components.Eager!, { props: { component: { label: 'two' } } })

    expect(screen.getByText('wheel one')).toBeInTheDocument()
    expect(screen.getByText('wheel two')).toBeInTheDocument()

    await rerender({ component: { label: 'three' } })

    expect(screen.getByText('wheel three')).toBeInTheDocument()
  })

  it('warns when two files claim the same key', () => {
    const warn = vi.fn()

    discoverComponents(
      {
        './fields/ColorWheel.svelte': { default: Wheel },
        './fields/shop/ColorWheel.svelte': { default: Wheel },
      },
      { warn },
    )

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('both auto-register the component "ColorWheel"'),
    )
  })
})
