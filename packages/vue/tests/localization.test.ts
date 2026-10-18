import { FormStore, Translator, type SchemaComponent } from '@alfakit/core'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { provideForm } from '../src/components/form/form-context'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import Spinner from '../src/components/ui/Spinner.vue'
import { ALFAKIT_KEY } from '../src/context'
import { actions, mountWithAlfakit, panel, registry, setPageProps } from './mocks'

const money: SchemaComponent = {
  type: 'MoneyInput',
  key: 'price',
  name: 'price',
  statePath: 'price',
  label: 'Price',
  currency: 'EUR',
  decimals: 2,
} as SchemaComponent

function renderForm(store: FormStore) {
  const Form = defineComponent({
    setup() {
      provideForm(store)

      return () => h(SchemaRenderer, { components: store.state.components })
    },
  })

  return mountWithAlfakit(() => h(Form))
}

describe('localization', () => {
  afterEach(() => setPageProps({ alfakit: panel }))

  it('parses a German money amount and rounds it to the currency on blur', async () => {
    setPageProps({
      alfakit: {
        ...panel,
        localization: { ...panel.localization, code: 'de', tag: 'de', currency: 'EUR' },
      },
    })

    const store = new FormStore(
      { components: [money], state: { price: null } },
      { token: 't', component: 'form' },
    )
    const wrapper = renderForm(store)
    const input = wrapper.find<HTMLInputElement>('input#alfakit-price')

    expect(input.attributes('dir')).toBe('ltr')
    expect(input.attributes('inputmode')).toBe('decimal')
    expect(wrapper.text()).toContain('€')

    await input.trigger('focus')
    await input.setValue('1.234,5')
    expect(store.getValue('price')).toBe('1234.5')

    await input.trigger('blur')
    expect(store.getValue('price')).toBe('1234.50')
    expect(input.element.value).toBe('1.234,50')

    wrapper.unmount()
  })

  it('renders translated aria-labels from the provided translations', () => {
    const wrapper = mount(Spinner, {
      global: {
        provide: {
          [ALFAKIT_KEY as symbol]: {
            registry,
            pages: {},
            actions,
            translator: new Translator({ loading: 'Wird geladen' }, 'de'),
          },
        },
      },
    })

    expect(wrapper.find('[role="status"]').attributes('aria-label')).toBe('Wird geladen')

    wrapper.unmount()
  })

  it('falls back to English without the Alfakit provider', () => {
    const wrapper = mount(Spinner)

    expect(wrapper.find('[role="status"]').attributes('aria-label')).toBe('Loading')

    wrapper.unmount()
  })
})
