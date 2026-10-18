import { initialWizardStep, persistWizardStep } from '../src/wizard'

describe('wizard step persistence', () => {
  it('opens on the persisted step when enabled', () => {
    expect(initialWizardStep(3, 1, true, '?step=3')).toBe(2)
    expect(initialWizardStep(3, 1, false, '?step=3')).toBe(0)
  })

  it('falls back to the start step for invalid values', () => {
    expect(initialWizardStep(3, 2, true, '?step=9')).toBe(1)
    expect(initialWizardStep(3, 2, true, '?step=abc')).toBe(1)
    expect(initialWizardStep(3, 5, true, '')).toBe(2)
  })

  it('writes the 1-based step into the URL', () => {
    persistWizardStep(1)

    expect(new URLSearchParams(window.location.search).get('step')).toBe('2')
  })
})
