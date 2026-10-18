import { FormStore, type SchemaComponent, type WizardSchema } from '@alfakit/core'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { EntryWrapper } from '../src/components/entries/entry-wrapper'
import { FormProvider } from '../src/components/form/form-context'
import { WizardComponent } from '../src/components/layout/wizard'
import { SchemaRenderer } from '../src/components/schema/schema-renderer'
import { actions, Wrapper } from './mocks'

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore({ components, state }, { token: 't', component: 'form' })

  return render(
    <Wrapper>
      <FormProvider store={store}>
        <SchemaRenderer components={store.state.components} />
      </FormProvider>
    </Wrapper>,
  )
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

describe('inline labels', () => {
  it('puts the field label beside the control from sm up', () => {
    const { container } = renderForm([input({ inlineLabel: true })], { key: 'abc' })
    const field = container.querySelector('[data-slot="field"]')!

    expect(field).toHaveAttribute('data-inline-label')
    expect(field.className).toContain('sm:grid-cols-3')
    // Stacked on phones: no fixed left/right, the grid follows the text direction.
    expect(field.className).toContain('flex-col')
    expect(screen.getByLabelText('API key')).toHaveValue('abc')
  })

  it('keeps the stacked layout without inlineLabel', () => {
    const { container } = renderForm([input({})], { key: '' })

    expect(container.querySelector('[data-slot="field"]')).not.toHaveAttribute('data-inline-label')
  })

  it('puts the entry label beside the value', () => {
    const { container } = render(
      <Wrapper>
        <EntryWrapper
          entry={{
            type: 'TextEntry',
            key: 'title',
            name: 'title',
            label: 'Title',
            inlineLabel: true,
          }}
        >
          Hello
        </EntryWrapper>
      </Wrapper>,
    )
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

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    })

    expect(writeText).toHaveBeenCalledWith('secret')
    expect(screen.getByRole('status')).toHaveTextContent('Key copied')
  })
})

const steps = [
  { type: 'Step', key: 'one', label: 'One', schema: [] },
  { type: 'Step', key: 'two', label: 'Two', schema: [], completedIcon: 'star' },
  { type: 'Step', key: 'three', label: 'Three', schema: [] },
] as WizardSchema['schema']

describe('wizard actions', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('renders customised next/previous buttons and persists the step under its key', () => {
    window.history.replaceState(null, '', '/?order-step=2')

    render(
      <Wrapper>
        <WizardComponent
          component={{
            type: 'Wizard',
            key: 'wizard',
            startStep: 1,
            nextActionLabel: 'Continue',
            previousActionLabel: 'Back',
            nextAction: { type: 'Action', name: 'next', label: 'Continue', icon: 'arrow-right' },
            previousAction: false,
            persistStepInQueryString: 'order-step',
            schema: steps,
          }}
        />
      </Wrapper>,
    )

    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(new URLSearchParams(window.location.search).get('order-step')).toBe('3')
  })

  it('shows the submit action on the last step and completed icons', () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined as never)

    const { container } = render(
      <Wrapper>
        <WizardComponent
          component={{
            type: 'Wizard',
            key: 'wizard',
            startStep: 3,
            nextActionLabel: 'Next',
            previousActionLabel: 'Back',
            completedIcon: 'check-circle',
            submitAction: {
              type: 'Action',
              name: 'placeOrder',
              label: 'Place order',
              hasAction: true,
            },
            schema: steps,
          }}
        />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Place order' }))

    expect(trigger).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'placeOrder' }),
      expect.objectContaining({ component: 'page' }),
    )
    // Completed steps show their own icon, else the wizard's, instead of the check mark.
    // (icons load asynchronously, so check that the default check mark is not used).
    expect(container.querySelectorAll('ol .lucide-check')).toHaveLength(0)
    trigger.mockRestore()
  })

  it('falls back to the check mark for completed steps', () => {
    const { container } = render(
      <Wrapper>
        <WizardComponent
          component={{
            type: 'Wizard',
            key: 'wizard',
            startStep: 3,
            nextActionLabel: 'Next',
            previousActionLabel: 'Back',
            schema: steps,
          }}
        />
      </Wrapper>,
    )

    // Step two has its own completed icon; step one falls back to the check mark.
    expect(container.querySelectorAll('ol .lucide-check')).toHaveLength(1)
  })

  it('renders Htmlable submit content', () => {
    const { container } = render(
      <Wrapper>
        <WizardComponent
          component={{
            type: 'Wizard',
            key: 'wizard',
            startStep: 1,
            nextActionLabel: 'Next',
            previousActionLabel: 'Back',
            submitActionHtml: '<button type="submit">Send</button>',
            schema: [steps[0]!],
          }}
        />
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="wizard-submit"] button')).toHaveTextContent('Send')
  })
})
