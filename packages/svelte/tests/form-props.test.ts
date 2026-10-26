import { FormStore, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import FormHarness from './FormHarness.svelte'
import Wrapper from './Wrapper.svelte'

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore({ components, state }, { token: 't', component: 'form' })
  const view = render(Wrapper, { props: { component: FormHarness, props: { store } } })

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
          schema: [text('a', { hint: '<strong>Bold</strong>', columnStart: { md: 2 } })],
        } as SchemaComponent,
      ],
      { a: '' },
    )

    expect(container.querySelector('strong')?.textContent).toBe('Bold')

    const grid = container.querySelector('[data-test="grid"]')!
    expect(grid.getAttribute('data-slot')).toBe('schema')
    expect(grid.className).toContain('custom-grid')
    expect(grid.className).toContain('grid-cols-2')
    expect(grid.querySelector('[data-slot="schema-item"]')!.className).toContain('md:col-start-2')
  })

  it('applies a TextInput mask', async () => {
    const { store } = renderForm([text('phone', { mask: '(999) 999-9999' })], { phone: '' })

    const input = screen.getByLabelText('phone') as HTMLInputElement
    await fireEvent.input(input, { target: { value: '5551234567x' } })

    expect(store.getValue('phone')).toBe('(555) 123-4567')
    expect(input.value).toBe('(555) 123-4567')
  })

  it('keeps out-of-range MoneyInput amounts so the server reports them (W-V3-11)', async () => {
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
    await fireEvent.focus(input)
    await fireEvent.input(input, { target: { value: '250' } })
    await fireEvent.blur(input)

    expect(store.getValue('price')).toBe('250.00')

    await fireEvent.focus(input)
    await fireEvent.input(input, { target: { value: '-5' } })
    await fireEvent.blur(input)

    expect(store.getValue('price')).toBe('-5.00')
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

  it('jumps to the errored wizard step once, then lets the user move', async () => {
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

    const panel = (label: string) => screen.getByLabelText(label).closest('.p-6')!

    store.setErrors({ b: 'Required' })
    await tick()
    expect(panel('b')).not.toHaveClass('hidden')

    await fireEvent.click(screen.getByRole('button', { name: /One/ }))
    expect(panel('a')).not.toHaveClass('hidden')
    expect(panel('b')).toHaveClass('hidden')
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
    expect(screen.getByLabelText('Download a.png')).toHaveAttribute('href', '/a.png')
  })
})
