import type { StandaloneComponentSchema } from '@alfakit/core'
import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
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
})
