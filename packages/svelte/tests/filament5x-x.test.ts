import type { TabsSchema, WizardSchema } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import TabsComponent from '../src/components/layout/TabsComponent.svelte'
import WizardComponent from '../src/components/layout/WizardComponent.svelte'
import ListTabs from '../src/components/table/ListTabs.svelte'
import Spinner from '../src/components/ui/spinner/Spinner.svelte'
import Wrapper from './Wrapper.svelte'

const wizard = (overrides: Partial<WizardSchema> = {}): WizardSchema => ({
  type: 'Wizard',
  key: 'wizard',
  startStep: 2,
  nextActionLabel: 'Next',
  previousActionLabel: 'Back',
  schema: [
    { type: 'Step', key: 'one', label: 'One', schema: [] },
    { type: 'Step', key: 'two', label: 'Two', schema: [] },
  ] as WizardSchema['schema'],
  ...overrides,
})

describe('Wizard::goToStep()', () => {
  it('moves to the step the server asks for', async () => {
    window.history.replaceState(null, '', '/')
    const { rerender } = render(Wrapper, {
      props: { component: WizardComponent, props: { component: wizard() } },
    })

    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()

    await rerender({
      props: {
        component: WizardComponent,
        props: { component: wizard({ goToStep: { step: 'one', id: 'a' } }) },
      },
    })
    await tick()

    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })
})

describe('schema tabs', () => {
  it('links each tab to a mounted panel', () => {
    const tabs = {
      type: 'Tabs',
      key: 'tabs',
      activeTab: 1,
      schema: [
        { type: 'Tab', key: 'a', label: 'A', schema: [] },
        { type: 'Tab', key: 'b', label: 'B', schema: [] },
      ],
    } as unknown as TabsSchema

    render(Wrapper, { props: { component: TabsComponent, props: { component: tabs } } })

    for (const tab of screen.getAllByRole('tab')) {
      const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '')

      expect(panel).not.toBeNull()
      expect(panel).toHaveAttribute('role', 'tabpanel')
      expect(panel).toHaveAttribute('aria-labelledby', tab.id)
    }
  })
})

describe('list tabs keyboard', () => {
  it('keeps one tab stop, moves focus with arrows and links the panel', async () => {
    const tabs = [
      { key: 'all', label: 'All' },
      { key: 'open', label: 'Open' },
      { key: 'closed', label: 'Closed' },
    ]
    render(Wrapper, {
      props: { component: ListTabs, props: { tabs, activeTab: 'open', idBase: 'lt' } },
    })
    const [all, open, closed] = screen.getAllByRole('tab')

    expect(open).toHaveAttribute('tabindex', '0')
    expect(all).toHaveAttribute('tabindex', '-1')
    expect(open).toHaveAttribute('aria-controls', 'lt-panel')

    open!.focus()
    await fireEvent.keyDown(open!, { key: 'ArrowRight' })
    expect(closed).toHaveFocus()
    await fireEvent.keyDown(closed!, { key: 'End' })
    expect(closed).toHaveFocus()
    await fireEvent.keyDown(closed!, { key: 'Home' })
    expect(all).toHaveFocus()
  })
})

describe('loading indicator', () => {
  it('renders a status with the loading-indicator icon', () => {
    render(Wrapper, { props: { component: Spinner } })
    const status = screen.getByRole('status')

    expect(status).toHaveAttribute('aria-label', 'Loading')
    expect(status.querySelector('svg')).toHaveClass('animate-spin')
  })
})
