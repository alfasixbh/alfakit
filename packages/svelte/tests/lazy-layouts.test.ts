import { render, screen } from '@testing-library/svelte'
import { createRawSnippet } from 'svelte'
import { lazyPanelLayouts } from '../src/layouts/lazy-layouts'
import { panelLayouts } from '../src/layouts/panel-layouts'
import Wrapper from './Wrapper.svelte'

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
    const children = createRawSnippet(() => ({
      render: () => '<p>inside the fullscreen layout</p>',
    }))

    render(Wrapper, {
      props: {
        component: lazyPanelLayouts['layout:fullscreen']!,
        props: { page: { fullscreen: { header: false } }, children },
      },
    })

    expect(await screen.findByText('inside the fullscreen layout')).toBeInTheDocument()
  })
})
