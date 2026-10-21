import { h } from 'vue'
import { lazyPanelLayouts } from '../src/layouts/lazy-layouts'
import { panelLayouts } from '../src/layouts/panel-layouts'
import { flush, mountWithAlfakit } from './mocks'

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
    const wrapper = mountWithAlfakit(() =>
      h(lazyPanelLayouts['layout:fullscreen']!, { page: { fullscreen: { header: false } } }, () =>
        h('p', 'inside the fullscreen layout'),
      ),
    )

    for (let i = 0; i < 10 && !wrapper.text().includes('inside'); i++) await flush()

    expect(wrapper.text()).toContain('inside the fullscreen layout')
    wrapper.unmount()
  })
})
