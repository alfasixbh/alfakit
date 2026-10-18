import { act, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { discoverComponents } from '../src/lib/discovery'

function Wheel({ component }: { component: { label: string } }) {
  return <p>wheel {component.label}</p>
}

describe('discoverComponents', () => {
  it('registers files under keys derived from their path', () => {
    const loader = () => Promise.resolve({ default: Wheel })
    const discovered = discoverComponents({
      './fields/ColorWheel.tsx': loader,
      './columns/ProgressBar.tsx': loader,
      './blocks/pricing.tsx': loader,
      './pages/Settings.tsx': loader,
      './lib/helpers.tsx': loader,
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
    const { components } = discoverComponents({ './fields/ColorWheel.tsx': loader })

    expect(loader).not.toHaveBeenCalled()

    await act(async () => {
      render(createElement(components.ColorWheel!, { component: { label: 'Hue' } }))
    })

    expect(loader).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('wheel Hue')).toBeInTheDocument()
  })

  it('renders preloaded and eager components synchronously', async () => {
    const { components, discovery } = discoverComponents({
      './fields/ColorWheel.tsx': () => Promise.resolve({ default: Wheel }),
      './entries/Eager.tsx': { default: Wheel },
    })

    await discovery.preloadFor({ props: { field: { type: 'ColorWheel' } } })

    render(
      <>
        {createElement(components.ColorWheel!, { component: { label: 'one' } })}
        {createElement(components.Eager!, { component: { label: 'two' } })}
      </>,
    )

    expect(screen.getByText('wheel one')).toBeInTheDocument()
    expect(screen.getByText('wheel two')).toBeInTheDocument()
  })

  it('warns when two files claim the same key', () => {
    const warn = vi.fn()

    discoverComponents(
      {
        './fields/ColorWheel.tsx': { default: Wheel },
        './fields/shop/ColorWheel.tsx': { default: Wheel },
      },
      { warn },
    )

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('both auto-register the component "ColorWheel"'),
    )
  })
})
