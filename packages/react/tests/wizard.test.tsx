import type { WizardSchema } from '@alfakit/core'
import { FormStore } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { FormProvider } from '../src/components/form/form-context'
import { WizardComponent } from '../src/components/layout/wizard'
import { Wrapper } from './mocks'

const wizard: WizardSchema = {
  type: 'Wizard',
  key: 'wizard',
  startStep: 1,
  nextActionLabel: 'Next',
  previousActionLabel: 'Back',
  persistStepInQueryString: true,
  schema: [
    { type: 'Step', key: 'one', label: 'One', schema: [] },
    { type: 'Step', key: 'two', label: 'Two', schema: [] },
  ] as WizardSchema['schema'],
}

describe('wizard', () => {
  it('persists the current step in the query string', () => {
    window.history.replaceState(null, '', '/admin/posts/create?step=2')

    const store = new FormStore(
      { components: [wizard], state: {} },
      { token: '', component: 'form' },
    )

    render(
      <Wrapper>
        <FormProvider store={store}>
          <WizardComponent component={wizard} />
        </FormProvider>
      </Wrapper>,
    )

    // Opens on the persisted second (last) step.
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(new URLSearchParams(window.location.search).get('step')).toBe('1')
    window.history.replaceState(null, '', '/')
  })

  it('renders outside a form without looping', () => {
    window.history.replaceState(null, '', '/')

    render(
      <Wrapper>
        <WizardComponent component={wizard} />
      </Wrapper>,
    )

    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })
})
