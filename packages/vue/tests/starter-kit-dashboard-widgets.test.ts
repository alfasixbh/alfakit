import type { StandaloneComponentSchema } from '@alfakit/core'
import { mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import dashboard from '../../core/tests/fixtures/standalone/starter-kit-dashboard.json'
import { AlfakitWidgets } from '../src/starter-kit'
import { panel, setPageProps } from './mocks'

const component = dashboard as unknown as StandaloneComponentSchema

beforeAll(() => {
  // The first standalone component mounts sonner's toaster, which reads the colour scheme.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
})

afterEach(() => {
  setPageProps({ alfakit: panel, page: undefined, alfakitWidgets: undefined })
})

describe('<AlfakitWidgets /> (starter kit dashboard)', () => {
  it('renders the panel widgets from the shared prop', async () => {
    // The host's dashboard: no `alfakit` prop, the widgets of the `admin` panel.
    setPageProps({
      alfakit: undefined,
      page: undefined,
      alfakitWidgets: [{ id: 'admin', component }],
    })

    const wrapper = mount(
      () => h(AlfakitWidgets, { class: 'gap-8' }, { default: () => h('p', 'Placeholder boxes') }),
      { attachTo: document.body },
    )

    await vi.waitFor(() => expect(wrapper.text()).toContain('Posts'))
    expect(wrapper.find('[data-slot="starter-kit-widgets"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="standalone"]').classes()).toContain('gap-8')
    expect(wrapper.text()).not.toContain('Placeholder boxes')

    wrapper.unmount()
  })

  it('renders its slot, or nothing, without widgets', () => {
    setPageProps({ alfakit: undefined, page: undefined, alfakitWidgets: null })

    expect(mount(AlfakitWidgets).html()).toBe('')
    expect(
      mount(() => h(AlfakitWidgets, null, { default: () => h('p', 'Placeholder boxes') })).text(),
    ).toBe('Placeholder boxes')

    // Another panel's widgets only.
    setPageProps({ alfakitWidgets: [{ id: 'admin', component }] })
    expect(mount(AlfakitWidgets, { props: { panel: 'crm' } }).html()).toBe('')
  })

  it('renders placeholders during SSR', async () => {
    setPageProps({
      alfakit: undefined,
      page: undefined,
      alfakitWidgets: [{ id: 'admin', component }],
    })

    const html = await renderToString(createSSRApp({ render: () => h(AlfakitWidgets) }))

    expect(html).toContain('data-slot="starter-kit-widgets-placeholder"')
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('Posts')
  })
})
