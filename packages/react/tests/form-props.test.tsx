import { FormStore, type SchemaComponent } from '@alfakit/core'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { FormProvider } from '../src/components/form/form-context'
import { SchemaRenderer } from '../src/components/schema/schema-renderer'
import { Wrapper } from './mocks'

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore({ components, state }, { token: 't', component: 'form' })

  const view = render(
    <Wrapper>
      <FormProvider store={store}>
        <SchemaRenderer components={store.state.components} />
      </FormProvider>
    </Wrapper>,
  )

  return { store, ...view }
}

const text = (name: string, extra: Record<string, unknown> = {}) =>
  ({
    type: 'TextInput',
    key: name,
    name,
    statePath: name,
    label: name,
    inputType: 'text',
    ...extra,
  }) as SchemaComponent

describe('form settings from PHP', () => {
  it('renders hint HTML, columnStart and layout extraAttributes', () => {
    const { container } = renderForm(
      [
        {
          type: 'Grid',
          key: 'grid',
          columns: { default: 2 },
          extraAttributes: { class: 'custom-grid', 'data-test': 'grid' },
          schema: [text('a', { hint: '<strong>Bold</strong> &amp; safe', columnStart: { md: 2 } })],
        } as SchemaComponent,
      ],
      { a: '' },
    )

    expect(container.querySelector('strong')?.textContent).toBe('Bold')
    expect(screen.getByText(/& safe/)).toBeInTheDocument()

    const grid = container.querySelector('[data-test="grid"]')!
    expect(grid.getAttribute('data-slot')).toBe('schema')
    expect(grid.className).toContain('custom-grid')
    expect(grid.className).toContain('grid-cols-2')
    expect(
      container.querySelector('[data-field="a"]')!.closest('[data-slot="schema-item"]')!.className,
    ).toContain('md:col-start-2')
  })

  it('applies a TextInput mask', () => {
    const { store } = renderForm([text('phone', { mask: '(999) 999-9999' })], { phone: '' })

    fireEvent.change(screen.getByLabelText('phone'), { target: { value: '5551234567x' } })

    expect(store.getValue('phone')).toBe('(555) 123-4567')
  })

  it('keeps MoneyInput amounts inside min and max', () => {
    const { store } = renderForm(
      [
        {
          type: 'MoneyInput',
          key: 'price',
          name: 'price',
          statePath: 'price',
          label: 'Price',
          currency: 'USD',
          decimals: 2,
          min: 1,
          max: 100,
        } as SchemaComponent,
      ],
      { price: null },
    )

    const input = screen.getByLabelText('Price')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '250' } })
    fireEvent.blur(input)

    expect(store.getValue('price')).toBe('100.00')
  })

  it('renders a non-native TimePicker as a time input, not a calendar', () => {
    const { container } = renderForm(
      [
        {
          type: 'TimePicker',
          key: 'at',
          name: 'at',
          statePath: 'at',
          label: 'At',
          format: 'H:i',
          hasDate: false,
          hasTime: true,
          native: false,
          timezone: 'UTC',
          firstDayOfWeek: 1,
          closeOnDateSelection: false,
        } as SchemaComponent,
      ],
      { at: '09:30' },
    )

    expect(container.querySelector('input[type="time"]')).toHaveValue('09:30')
  })

  it('jumps to the errored wizard step once, then lets the user move', () => {
    const { store } = renderForm(
      [
        {
          type: 'Wizard',
          key: 'wizard',
          startStep: 1,
          submitActionLabel: 'Submit',
          schema: [
            { type: 'Step', key: 'one', label: 'One', schema: [text('a')] },
            { type: 'Step', key: 'two', label: 'Two', schema: [text('b')] },
          ],
        } as SchemaComponent,
      ],
      { a: '', b: '' },
    )

    const step = (label: string) => screen.getByLabelText(label).closest('.p-6')!

    act(() => store.setErrors({ b: 'Required' }))
    expect(step('b')).not.toHaveClass('hidden')

    fireEvent.click(screen.getByRole('button', { name: /One/ }))
    expect(step('a')).not.toHaveClass('hidden')
    expect(step('b')).toHaveClass('hidden')
  })

  it('hides image previews when previewable is off and translates the download label', () => {
    const { container } = renderForm(
      [
        {
          type: 'FileUpload',
          key: 'photo',
          name: 'photo',
          statePath: 'photo',
          label: 'Photo',
          image: true,
          downloadable: true,
          previewable: false,
          deletable: true,
          panelLayout: 'compact',
          files: [{ path: 'a.png', name: 'a.png', url: '/a.png' }],
        } as SchemaComponent,
      ],
      { photo: 'a.png' },
    )

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByLabelText('Download')).toHaveAttribute('href', '/a.png')
  })
})
