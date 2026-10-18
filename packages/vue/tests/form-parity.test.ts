import { FormStore, type SchemaComponent, type WizardSchema } from '@alfakit/core'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import EntryWrapper from '../src/components/entries/EntryWrapper.vue'
import { provideForm } from '../src/components/form/form-context'
import WizardComponent from '../src/components/layout/WizardComponent.vue'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import { actions, mountWithAlfakit } from './mocks'

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore({ components, state }, { token: 't', component: 'form' })
  const Form = defineComponent({
    setup() {
      provideForm(store)

      return () => h(SchemaRenderer, { components: store.state.components })
    },
  })

  return mountWithAlfakit(() => h(Form))
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

describe('inline labels', () => {
  afterEach(() => (document.body.innerHTML = ''))

  it('puts the field label beside the control from sm up', () => {
    const wrapper = renderForm([input({ inlineLabel: true })], { key: 'abc' })
    const field = wrapper.find('[data-slot="field"]')

    expect(field.attributes('data-inline-label')).toBe('')
    expect(field.classes()).toContain('sm:grid-cols-3')
    expect(field.find('[data-slot="field-label"] label').text()).toContain('API key')
  })

  it('keeps the stacked layout without inlineLabel', () => {
    const wrapper = renderForm([input({})], { key: '' })

    expect(wrapper.find('[data-slot="field"]').attributes('data-inline-label')).toBeUndefined()
  })

  it('puts the entry label beside the value', () => {
    const wrapper = mountWithAlfakit(() =>
      h(
        EntryWrapper,
        {
          entry: {
            type: 'TextEntry',
            key: 'title',
            name: 'title',
            label: 'Title',
            inlineLabel: true,
          },
        },
        () => 'Hello',
      ),
    )
    const entry = wrapper.find('[data-slot="entry"]')

    expect(entry.attributes('data-inline-label')).toBe('')
    expect(entry.classes()).toContain('sm:grid-cols-3')
    expect(entry.find('[data-slot="entry-value"]').text()).toBe('Hello')
  })
})

describe('copyable text input', () => {
  afterEach(() => (document.body.innerHTML = ''))

  it('copies the value and announces the copy message', async () => {
    const writeText = vi.fn(async () => undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const wrapper = renderForm(
      [input({ copyable: true, copyMessage: 'Key copied', autocomplete: 'off' })],
      { key: 'secret' },
    )

    expect(wrapper.find('input').attributes('autocomplete')).toBe('off')

    await wrapper.find('button[aria-label="Copy"]').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('secret')
    expect(wrapper.find('[role="status"]').text()).toBe('Key copied')
  })
})

describe('wizard actions', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    window.history.replaceState(null, '', '/')
  })

  it('renders customised next/previous buttons and persists the step under its key', async () => {
    window.history.replaceState(null, '', '/?order-step=2')

    const wrapper = mountWithAlfakit(() =>
      h(WizardComponent, {
        component: wizard({
          nextActionLabel: 'Continue',
          nextAction: { type: 'Action', name: 'next', label: 'Continue', icon: 'arrow-right' },
          previousAction: false,
          persistStepInQueryString: 'order-step',
        }),
      }),
    )

    const buttons = wrapper.findAll('button').map((button) => button.text())

    expect(buttons).not.toContain('Back')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Continue')!
      .trigger('click')
    await flushPromises()

    expect(new URLSearchParams(window.location.search).get('order-step')).toBe('3')
  })

  it('shows the submit action on the last step and completed icons', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined as never)

    const wrapper = mountWithAlfakit(() =>
      h(WizardComponent, {
        component: wizard({
          startStep: 3,
          completedIcon: 'check-circle',
          submitAction: {
            type: 'Action',
            name: 'placeOrder',
            label: 'Place order',
            hasAction: true,
          },
        }),
      }),
    )

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Place order')!
      .trigger('click')

    expect(trigger).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'placeOrder' }),
      expect.objectContaining({ component: 'page' }),
    )
    expect(wrapper.findAll('ol .lucide-check')).toHaveLength(0)
    trigger.mockRestore()
  })

  it('falls back to the check mark for completed steps', () => {
    const wrapper = mountWithAlfakit(() =>
      h(WizardComponent, { component: wizard({ startStep: 3 }) }),
    )

    expect(wrapper.findAll('ol .lucide-check')).toHaveLength(1)
  })

  it('renders Htmlable submit content', () => {
    const wrapper = mountWithAlfakit(() =>
      h(WizardComponent, {
        component: wizard({
          schema: [steps[0]!],
          submitActionHtml: '<button type="submit">Send</button>',
        }),
      }),
    )

    expect(wrapper.find('[data-slot="wizard-submit"] button').text()).toBe('Send')
  })
})
