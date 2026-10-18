import { FormStore, type SchemaComponent, type WizardSchema } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { createRawSnippet, tick } from 'svelte'
import EntryWrapper from '../src/components/entries/EntryWrapper.svelte'
import WizardComponent from '../src/components/layout/WizardComponent.svelte'
import FormHarness from './FormHarness.svelte'
import { actions } from './mocks'
import Wrapper from './Wrapper.svelte'

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore({ components, state }, { token: 't', component: 'form' })

  return render(Wrapper, { props: { component: FormHarness, props: { store } } })
}

const input = (props: Record<string, unknown>) =>
  ({
    type: 'TextInput',
    key: 'key',
    name: 'key',
    statePath: 'key',
    label: 'API key',
    inputType: 'text',
    ...props,
  }) as SchemaComponent

const steps = [
  { type: 'Step', key: 'one', label: 'One', schema: [] },
  { type: 'Step', key: 'two', label: 'Two', schema: [], completedIcon: 'star' },
  { type: 'Step', key: 'three', label: 'Three', schema: [] },
] as WizardSchema['schema']

const wizard = (props: Partial<WizardSchema>): WizardSchema => ({
  type: 'Wizard',
  key: 'wizard',
  startStep: 1,
  nextActionLabel: 'Next',
  previousActionLabel: 'Back',
  schema: steps,
  ...props,
})

const renderWizard = (component: WizardSchema) =>
  render(Wrapper, { props: { component: WizardComponent, props: { component } } })

describe('inline labels', () => {
  it('puts the field label beside the control from sm up', () => {
    const { container } = renderForm([input({ inlineLabel: true })], { key: 'abc' })
    const field = container.querySelector('[data-slot="field"]')!

    expect(field).toHaveAttribute('data-inline-label')
    expect(field.className).toContain('sm:grid-cols-3')
    expect(screen.getByLabelText('API key')).toHaveValue('abc')
  })

  it('keeps the stacked layout without inlineLabel', () => {
    const { container } = renderForm([input({})], { key: '' })

    expect(container.querySelector('[data-slot="field"]')).not.toHaveAttribute('data-inline-label')
  })

  it('puts the entry label beside the value', () => {
    const children = createRawSnippet(() => ({ render: () => '<span>Hello</span>' }))
    const { container } = render(Wrapper, {
      props: {
        component: EntryWrapper,
        props: {
          entry: {
            type: 'TextEntry',
            key: 'title',
            name: 'title',
            label: 'Title',
            inlineLabel: true,
          },
          children,
        },
      },
    })
    const entry = container.querySelector('[data-slot="entry"]')!

    expect(entry).toHaveAttribute('data-inline-label')
    expect(entry.className).toContain('sm:grid-cols-3')
    expect(screen.getByRole('group', { name: 'Title' })).toHaveTextContent('Hello')
  })
})

describe('copyable text input', () => {
  it('copies the value and announces the copy message', async () => {
    const writeText = vi.fn(async () => undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    renderForm([input({ copyable: true, copyMessage: 'Key copied', autocomplete: 'off' })], {
      key: 'secret',
    })

    expect(screen.getByLabelText('API key')).toHaveAttribute('autocomplete', 'off')

    await fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    await tick()

    expect(writeText).toHaveBeenCalledWith('secret')
    expect(screen.getByRole('status')).toHaveTextContent('Key copied')
  })
})

describe('wizard actions', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('renders customised next/previous buttons and persists the step under its key', async () => {
    window.history.replaceState(null, '', '/?order-step=2')

    renderWizard(
      wizard({
        nextActionLabel: 'Continue',
        nextAction: { type: 'Action', name: 'next', label: 'Continue', icon: 'arrow-right' },
        previousAction: false,
        persistStepInQueryString: 'order-step',
      }),
    )

    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await tick()

    expect(new URLSearchParams(window.location.search).get('order-step')).toBe('3')
  })

  it('shows the submit action on the last step and completed icons', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined as never)

    const { container } = renderWizard(
      wizard({
        startStep: 3,
        completedIcon: 'check-circle',
        submitAction: { type: 'Action', name: 'placeOrder', label: 'Place order', hasAction: true },
      }),
    )

    await fireEvent.click(screen.getByRole('button', { name: 'Place order' }))

    expect(trigger).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'placeOrder' }),
      expect.objectContaining({ component: 'page' }),
    )
    expect(container.querySelectorAll('ol .lucide-check')).toHaveLength(0)
    trigger.mockRestore()
  })

  it('falls back to the check mark for completed steps', () => {
    const { container } = renderWizard(wizard({ startStep: 3 }))

    expect(container.querySelectorAll('ol .lucide-check')).toHaveLength(1)
  })

  it('renders Htmlable submit content', () => {
    const { container } = renderWizard(
      wizard({ schema: [steps[0]!], submitActionHtml: '<button type="submit">Send</button>' }),
    )

    expect(container.querySelector('[data-slot="wizard-submit"] button')).toHaveTextContent('Send')
  })
})
