import type { StandaloneComponentSchema } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
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

    render(
      <AlfakitWidgets className="gap-8">
        <p>Placeholder boxes</p>
      </AlfakitWidgets>,
    )

    expect(await screen.findByText('Posts')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="starter-kit-widgets"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="standalone"]')).toHaveClass('gap-8')
    expect(screen.queryByText('Placeholder boxes')).toBeNull()
  })

  it('renders its children, or nothing, without widgets', () => {
    setPageProps({ alfakit: undefined, page: undefined, alfakitWidgets: null })

    const { container, rerender } = render(<AlfakitWidgets />)
    expect(container).toBeEmptyDOMElement()

    rerender(
      <AlfakitWidgets>
        <p>Placeholder boxes</p>
      </AlfakitWidgets>,
    )
    expect(screen.getByText('Placeholder boxes')).toBeInTheDocument()

    // Another panel's widgets only.
    setPageProps({ alfakitWidgets: [{ id: 'admin', component }] })
    rerender(<AlfakitWidgets panel="crm" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders placeholders during SSR', () => {
    setPageProps({
      alfakit: undefined,
      page: undefined,
      alfakitWidgets: [{ id: 'admin', component }],
    })

    const html = renderToString(<AlfakitWidgets />)

    expect(html).toContain('data-slot="starter-kit-widgets-placeholder"')
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('Posts')
  })

  it('shows an error with a retry when a lazy widget is refused, not a skeleton forever (W-F-12)', async () => {
    const widget = (component.content[0] as unknown as { widgets: Array<Record<string, unknown>> })
      .widgets[0]!
    const lazy = {
      ...component,
      class: 'App\\RefusedDashboard',
      token: 'refused',
      lazy: [`widget:${String(widget.id)}`],
      content: [{ ...component.content[0], widgets: [{ ...widget, lazy: true }] }],
    } as unknown as StandaloneComponentSchema
    let allow = false
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => ({
        ok: allow,
        status: allow ? 200 : 403,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () =>
          allow ? { [`widget:${String(widget.id)}`]: widget } : { message: 'Forbidden' },
        text: async () =>
          JSON.stringify(
            allow ? { [`widget:${String(widget.id)}`]: widget } : { message: 'Forbidden' },
          ),
      })),
    )
    setPageProps({
      alfakit: undefined,
      page: undefined,
      alfakitWidgets: [{ id: 'admin', component: lazy }],
    })

    render(<AlfakitWidgets />)

    expect(await screen.findByText('This widget could not be loaded.')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="lazy-placeholder"][aria-busy="true"]')).toBeNull()

    allow = true
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Posts')).toBeInTheDocument()
    expect(screen.queryByText('This widget could not be loaded.')).toBeNull()

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

    render(<AlfakitWidgets />)

    expect(await screen.findByRole('button', { name: 'Edit dashboard' })).toBeInTheDocument()
    expect(await screen.findByText('Posts')).toBeInTheDocument()
  })
})
