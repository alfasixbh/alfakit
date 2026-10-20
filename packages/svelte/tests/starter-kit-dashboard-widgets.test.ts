import type { StandaloneComponentSchema } from '@alfakit/core'
import { render, screen } from '@testing-library/svelte'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import dashboard from '../../core/tests/fixtures/standalone/starter-kit-dashboard.json'
import { AlfakitWidgets } from '../src/starter-kit'
import DashboardWidgetsHarness from './DashboardWidgetsHarness.svelte'
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

    render(DashboardWidgetsHarness, { props: { class: 'gap-8' } })

    expect(await screen.findByText('Posts')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="starter-kit-widgets"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="standalone"]')).toHaveClass('gap-8')
    expect(screen.queryByText('Placeholder boxes')).toBeNull()
  })

  it('renders its children, or nothing, without widgets', () => {
    setPageProps({ alfakit: undefined, page: undefined, alfakitWidgets: null })

    const empty = render(AlfakitWidgets)
    expect(empty.container.querySelector('[data-slot]')).toBeNull()
    expect(empty.container.textContent?.trim()).toBe('')
    empty.unmount()

    render(DashboardWidgetsHarness)
    expect(screen.getByText('Placeholder boxes')).toBeInTheDocument()
  })

  it('shows only the named panel', () => {
    setPageProps({
      alfakit: undefined,
      page: undefined,
      alfakitWidgets: [{ id: 'admin', component }],
    })

    render(DashboardWidgetsHarness, { props: { panel: 'crm' } })

    expect(screen.getByText('Placeholder boxes')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="starter-kit-widgets"]')).toBeNull()
  })
})
