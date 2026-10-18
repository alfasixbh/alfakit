import type { WizardSchema } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { WizardComponent } from '../src/components/layout/wizard'
import { ListTabs, ListTabsPanel } from '../src/components/table/list-tabs'
import { Spinner } from '../src/components/ui/spinner'
import { Wrapper } from './mocks'

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
  it('moves to the step the server asks for, once per request', () => {
    window.history.replaceState(null, '', '/')
    const { rerender } = render(
      <Wrapper>
        <WizardComponent component={wizard()} />
      </Wrapper>,
    )

    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()

    rerender(
      <Wrapper>
        <WizardComponent component={wizard({ goToStep: { step: 'one', id: 'a' } })} />
      </Wrapper>,
    )

    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })
})

describe('list tabs keyboard', () => {
  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'closed', label: 'Closed' },
  ]

  it('keeps one tab stop, moves focus with arrows and links the panel', () => {
    render(
      <Wrapper>
        <ListTabs tabs={tabs} activeTab="open" label="Posts" idBase="lt" />
        <ListTabsPanel idBase="lt" activeTab="open">
          <p>Table</p>
        </ListTabsPanel>
      </Wrapper>,
    )

    const [all, open, closed] = screen.getAllByRole('tab')

    expect(open).toHaveAttribute('tabindex', '0')
    expect(all).toHaveAttribute('tabindex', '-1')
    expect(open).toHaveAttribute('aria-controls', 'lt-panel')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', open!.id)

    open!.focus()
    fireEvent.keyDown(open!, { key: 'ArrowRight' })
    expect(closed).toHaveFocus()
    fireEvent.keyDown(closed!, { key: 'ArrowRight' })
    expect(all).toHaveFocus()
    fireEvent.keyDown(all!, { key: 'End' })
    expect(closed).toHaveFocus()
  })
})

describe('loading indicator', () => {
  it('renders a status with the loading-indicator icon', () => {
    render(
      <Wrapper>
        <Spinner />
      </Wrapper>,
    )

    const status = screen.getByRole('status')

    expect(status).toHaveAttribute('aria-label', 'Loading')
    expect(status.querySelector('svg')).toHaveClass('animate-spin')
  })
})
