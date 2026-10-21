import { render, screen } from '@testing-library/react'
import { lazyPanelLayouts } from '../src/layouts/lazy-layouts'
import { panelLayouts } from '../src/layouts/panel-layouts'
import { Wrapper } from './mocks'

describe('panel layouts', () => {
  it('registers every panel layout for createAlfakit(), the starter kit loads some lazily', () => {
    expect(Object.keys(panelLayouts).sort()).toEqual([
      'layout:app',
      'layout:auth',
      'layout:blank',
      'layout:fullscreen',
    ])
    expect(Object.keys(lazyPanelLayouts)).toEqual(['layout:fullscreen'])
  })

  it('loads a layout the registry does not have on demand (starter kit fullscreen pages)', async () => {
    const Fullscreen = lazyPanelLayouts['layout:fullscreen']!

    render(
      <Wrapper>
        <Fullscreen page={{ fullscreen: { header: false } }}>
          <p>inside the fullscreen layout</p>
        </Fullscreen>
      </Wrapper>,
    )

    expect(await screen.findByText('inside the fullscreen layout')).toBeInTheDocument()
  })
})
