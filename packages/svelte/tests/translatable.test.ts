import { FormStore, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import FormHarness from './FormHarness.svelte'
import Wrapper from './Wrapper.svelte'

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
  const view = render(Wrapper, { props: { component: FormHarness, props: { store } } })

  return { store, ...view }
}

describe('translatable fields', () => {
  it('edits one language at a time with the field renderer', async () => {
    const { store } = renderTranslatable()
    const english = screen.getByLabelText(/Title/)

    expect(english).toHaveValue('Hello')
    expect(english).toHaveAttribute('lang', 'en')
    expect(english).toBeRequired()
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')

    await fireEvent.click(screen.getByRole('button', { name: 'العربية' }))

    const arabic = screen.getByLabelText(/Title/)

    expect(arabic).toHaveAttribute('lang', 'ar')
    expect(arabic).toHaveAttribute('dir', 'rtl')
    expect(arabic).not.toBeRequired()

    await fireEvent.input(arabic, { target: { value: 'مرحبا' } })

    expect(store.getValue('title')).toEqual({ en: 'Hello', ar: 'مرحبا' })
  })

  it('marks languages with errors and opens the first of them', async () => {
    const { store } = renderTranslatable()

    store.setErrors({ 'title.ar': ['The title (العربية) field is required.'] })
    await tick()
    await tick()

    const arabic = screen.getByRole('button', { name: /العربية/ })

    expect(arabic).toHaveAttribute('aria-pressed', 'true')
    expect(arabic).toHaveAttribute('data-invalid', 'true')
    expect(screen.getByText('The title (العربية) field is required.')).toBeInTheDocument()
  })
})
