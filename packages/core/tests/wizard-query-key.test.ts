import {
  completedStepIcon,
  initialWizardStep,
  persistWizardStep,
  wizardStepQueryKey,
} from '../src/wizard'

describe('wizard step query-string key', () => {
  it('resolves the key from the server value', () => {
    expect(wizardStepQueryKey('order-step')).toBe('order-step')
    expect(wizardStepQueryKey(true)).toBe('step')
    expect(wizardStepQueryKey(false)).toBeNull()
    expect(wizardStepQueryKey('')).toBeNull()
    expect(wizardStepQueryKey(undefined)).toBeNull()
  })

  it('reads the persisted step under a custom key', () => {
    expect(initialWizardStep(3, 1, 'order-step', '?order-step=3&step=2')).toBe(2)
    expect(initialWizardStep(3, 1, 'order-step', '?step=2')).toBe(0)
  })

  it('writes the step under a custom key', () => {
    persistWizardStep(2, 'order-step')

    expect(new URLSearchParams(window.location.search).get('order-step')).toBe('3')
  })

  it('picks the completed icon of the step, then the wizard', () => {
    expect(completedStepIcon({ completedIcon: 'star' }, { completedIcon: 'check-circle' })).toBe(
      'star',
    )
    expect(completedStepIcon({}, { completedIcon: 'check-circle' })).toBe('check-circle')
    expect(completedStepIcon({}, {})).toBeUndefined()
  })
})
