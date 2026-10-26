import { FormStore, type SchemaComponent } from '@alfakit/core'
import { defineComponent, h, nextTick } from 'vue'
import { provideForm } from '../src/components/form/form-context'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import { mountWithAlfakit } from './mocks'

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore({ components, state }, { token: 't', component: 'form' })
  const Form = defineComponent({
    setup() {
      provideForm(store)

      return () => h(SchemaRenderer, { components: store.state.components })
    },
  })

  return { store, wrapper: mountWithAlfakit(() => h(Form)) }
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
    const { wrapper } = renderForm(
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

    expect(wrapper.find('strong').text()).toBe('Bold')

    const grid = wrapper.find('[data-test="grid"]')
    expect(grid.attributes('data-slot')).toBe('schema')
    expect(grid.classes()).toContain('custom-grid')
    expect(grid.classes()).toContain('grid-cols-2')
    expect(grid.find('[data-slot="schema-item"]').classes()).toContain('md:col-start-2')
  })

  it('applies a TextInput mask', async () => {
    const { store, wrapper } = renderForm([text('phone', { mask: '(999) 999-9999' })], {
      phone: '',
    })

    const input = wrapper.find('input#alfakit-phone')
    await input.setValue('5551234567x')

    expect(store.getValue('phone')).toBe('(555) 123-4567')
    expect((input.element as HTMLInputElement).value).toBe('(555) 123-4567')
  })

  it('keeps out-of-range MoneyInput amounts so the server reports them (W-V3-11)', async () => {
    const { store, wrapper } = renderForm(
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

    const input = wrapper.find('input#alfakit-price')
    await input.trigger('focus')
    await input.setValue('250')
    await input.trigger('blur')

    expect(store.getValue('price')).toBe('250.00')

    await input.trigger('focus')
    await input.setValue('-5')
    await input.trigger('blur')

    expect(store.getValue('price')).toBe('-5.00')
  })

  it('renders a non-native TimePicker as a time input, not a calendar', () => {
    const { wrapper } = renderForm(
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

    expect((wrapper.find('input[type="time"]').element as HTMLInputElement).value).toBe('09:30')
  })

  it("names the calendar grid after the field, not Reka's default (W-V2-02)", async () => {
    const { wrapper } = renderForm(
      [
        {
          type: 'DatePicker',
          key: 'starts_on',
          name: 'starts_on',
          statePath: 'starts_on',
          label: 'Starts on',
          format: 'Y-m-d',
          hasDate: true,
          hasTime: false,
          native: false,
          timezone: 'UTC',
          firstDayOfWeek: 1,
          closeOnDateSelection: true,
        } as SchemaComponent,
      ],
      { starts_on: '2026-10-05' },
    )

    await wrapper.find('button').trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 20))

    const grid = document.body.querySelector('[data-slot="calendar"], [role="application"]')

    expect(grid?.getAttribute('aria-label')).toMatch(/^Starts on/)
  })

  it('jumps to the errored wizard step once, then lets the user move', async () => {
    const { store, wrapper } = renderForm(
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

    const panel = (name: string) => wrapper.find(`input#alfakit-${name}`).element.closest('.p-6')!

    store.setErrors({ b: 'Required' })
    await nextTick()
    expect(panel('b').classList.contains('hidden')).toBe(false)

    await wrapper.findAll('ol button')[0]!.trigger('click')
    expect(panel('a').classList.contains('hidden')).toBe(false)
    expect(panel('b').classList.contains('hidden')).toBe(true)
  })

  it('hides image previews when previewable is off and translates the download label', () => {
    const { wrapper } = renderForm(
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

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('a[aria-label="Download a.png"]').attributes('href')).toBe('/a.png')
  })
})
