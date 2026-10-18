import { FormStore, type SchemaComponent } from '@alfakit/core'
import { defineComponent, h, nextTick } from 'vue'
import { provideForm } from '../src/components/form/form-context'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import { mountWithAlfakit } from './mocks'

const title = {
  type: 'TextInput',
  key: 'title',
  name: 'title',
  statePath: 'title',
  label: 'Title',
  inputType: 'text',
  translatable: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', tag: 'en', label: 'English', direction: 'ltr', required: true },
      { code: 'ar', tag: 'ar', label: 'العربية', direction: 'rtl', required: null },
    ],
  },
} as SchemaComponent

function renderTranslatable() {
  const store = new FormStore(
    { components: [title], state: { title: { en: 'Hello', ar: null } } },
    { token: 't', component: 'form' },
  )
  const Form = defineComponent({
    setup() {
      provideForm(store)

      return () => h(SchemaRenderer, { components: store.state.components })
    },
  })

  return { store, wrapper: mountWithAlfakit(() => h(Form)) }
}

describe('translatable fields', () => {
  it('edits one language at a time with the field renderer', async () => {
    const { store, wrapper } = renderTranslatable()
    const english = wrapper.find('input#alfakit-title-en')

    expect((english.element as HTMLInputElement).value).toBe('Hello')
    expect(english.attributes('lang')).toBe('en')
    expect(english.attributes('required')).toBeDefined()

    const buttons = wrapper.findAll('[data-slot="translatable-locales"] button')

    expect(buttons[0]!.attributes('aria-pressed')).toBe('true')

    await buttons[1]!.trigger('click')

    const arabic = wrapper.find('input#alfakit-title-ar')

    expect(arabic.attributes('lang')).toBe('ar')
    expect(arabic.attributes('dir')).toBe('rtl')
    expect(arabic.attributes('required')).toBeUndefined()

    await arabic.setValue('مرحبا')

    expect(store.getValue('title')).toEqual({ en: 'Hello', ar: 'مرحبا' })
  })

  it('marks languages with errors and opens the first of them', async () => {
    const { store, wrapper } = renderTranslatable()

    store.setErrors({ 'title.ar': ['The title (العربية) field is required.'] })
    await nextTick()
    await nextTick()

    const arabic = wrapper.findAll('[data-slot="translatable-locales"] button')[1]!

    expect(arabic.attributes('aria-pressed')).toBe('true')
    expect(arabic.attributes('data-invalid')).toBe('true')
    expect(wrapper.text()).toContain('The title (العربية) field is required.')
  })
})
