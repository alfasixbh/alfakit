import { FormStore, type SchemaComponent } from '@alfakit/core'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { FormProvider } from '../src/components/form/form-context'
import { SchemaRenderer } from '../src/components/schema/schema-renderer'
import { Wrapper } from './mocks'

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

  const view = render(
    <Wrapper>
      <FormProvider store={store}>
        <SchemaRenderer components={store.state.components} />
      </FormProvider>
    </Wrapper>,
  )

  return { store, ...view }
}

describe('translatable fields', () => {
  it('edits one language at a time with the field renderer', () => {
    const { store } = renderTranslatable()
    const english = screen.getByLabelText(/Title/)

    expect(english).toHaveValue('Hello')
    expect(english).toHaveAttribute('lang', 'en')
    expect(english).toBeRequired()
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'العربية' }))

    const arabic = screen.getByLabelText(/Title/)

    expect(arabic).toHaveAttribute('lang', 'ar')
    expect(arabic).toHaveAttribute('dir', 'rtl')
    expect(arabic).not.toBeRequired()

    fireEvent.change(arabic, { target: { value: 'مرحبا' } })

    expect(store.getValue('title')).toEqual({ en: 'Hello', ar: 'مرحبا' })
  })

  it('marks languages with errors and opens the first of them', () => {
    const { store } = renderTranslatable()

    act(() => store.setErrors({ 'title.ar': ['The title (العربية) field is required.'] }))

    const arabic = screen.getByRole('button', { name: /العربية/ })

    expect(arabic).toHaveAttribute('aria-pressed', 'true')
    expect(arabic).toHaveAttribute('data-invalid', 'true')
    expect(screen.getByText('The title (العربية) field is required.')).toBeInTheDocument()
    expect(screen.getByRole('group')).toHaveAttribute('data-slot', 'translatable-locales')
  })
})
