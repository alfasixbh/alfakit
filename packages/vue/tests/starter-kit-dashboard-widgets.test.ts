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

  it('shows an error with a retry when a lazy widget is refused, not a skeleton forever (W-F-12)', async () => {
    const widget = (component.content[0] as unknown as { widgets: Array<Record<string, unknown>> })
      .widgets[0]!
    const target = `widget:${String(widget.id)}`
    const lazy = {
      ...component,
      class: 'App\\RefusedDashboard',
      token: 'refused',
      lazy: [target],
      content: [{ ...component.content[0], widgets: [{ ...widget, lazy: true }] }],
    } as unknown as StandaloneComponentSchema
    let allow = false
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => ({
        ok: allow,
        status: allow ? 200 : 403,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => (allow ? { [target]: widget } : { message: 'Forbidden' }),
        text: async () => JSON.stringify(allow ? { [target]: widget } : { message: 'Forbidden' }),
      })),
    )
    setPageProps({
      alfakit: undefined,
      page: undefined,
      alfakitWidgets: [{ id: 'admin', component: lazy }],
    })

    const wrapper = mount(AlfakitWidgets, { attachTo: document.body })

    await vi.waitFor(() => expect(wrapper.text()).toContain('This widget could not be loaded.'))
    expect(wrapper.find('[data-slot="lazy-placeholder"][aria-busy="true"]').exists()).toBe(false)

    allow = true
    const retry = wrapper.findAll('button').find((button) => button.text() === 'Retry')!
    await retry.trigger('click')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Posts'))
    expect(wrapper.text()).not.toContain('This widget could not be loaded.')

    wrapper.unmount()
    vi.unstubAllGlobals()
  })

  it('offers "Edit dashboard" when the panel dashboard is customizable (W-38)', async () => {
    const block = component.content[0] as unknown as { widgets: Array<{ id: string }> }
    const id = block.widgets[0]!.id
    const entry = { id, span: null, hidden: false }
    const customizable = {
      ...component,
      content: [
        {
          ...block,
          customize: {
            endpoint: '/admin/_alfakit/dashboard/layout',
            token: 'dashboard-token',
            customized: false,
            layout: [entry],
            defaultLayout: [entry],
            library: [{ id, label: 'Posts', default: true, span: 1, spans: [] }],
          },
        },
      ],
    } as unknown as StandaloneComponentSchema
    setPageProps({
      alfakit: undefined,
      page: undefined,
      alfakitWidgets: [{ id: 'admin', component: customizable }],
    })

    const wrapper = mount(AlfakitWidgets, { attachTo: document.body })

    await vi.waitFor(() =>
      expect(wrapper.findAll('button').some((button) => button.text() === 'Edit dashboard')).toBe(
        true,
      ),
    )
    expect(wrapper.text()).toContain('Posts')

    wrapper.unmount()
  })
})
