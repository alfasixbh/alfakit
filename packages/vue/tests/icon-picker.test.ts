import { FormStore, type IconPickerResponse, type IconPickerSchema } from '@alfakit/core'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import IconPickerField from '../src/components/fields/IconPickerField.vue'
import { provideForm } from '../src/components/form/form-context'
import { mountWithAlfakit, panel, setPageProps } from './mocks'

const field: IconPickerSchema = {
  type: 'IconPicker',
  key: 'icon',
  name: 'icon',
  statePath: 'icon',
  label: 'Icon',
  sets: [
    { key: 'lucide', label: 'Lucide' },
    { key: 'mdi', label: 'Material Design Icons' },
  ],
  searchable: true,
  gridColumns: 2,
  previewSize: 'md',
}

function response(values: string[], hasMore = false, page = 1): IconPickerResponse {
  return {
    icons: values.map((value) => ({
      value,
      icon: value.startsWith('mdi-') ? '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>' : value,
    })),
    page,
    hasMore,
    total: values.length,
  }
}

function renderPicker(component: IconPickerSchema, state: Record<string, unknown>) {
  const store = new FormStore({ components: [component], state }, { token: 't', component: 'form' })
  const searchIcons = vi
    .spyOn(store, 'searchIcons')
    .mockResolvedValue(response(['house', 'users', 'mdi-home']))
  const Form = defineComponent({
    setup() {
      provideForm(store)

      return () => h(IconPickerField, { component })
    },
  })

  return { store, searchIcons, wrapper: mountWithAlfakit(() => h(Form)) }
}

const trigger = () =>
  document.querySelector<HTMLButtonElement>('[data-slot="icon-picker-trigger"]')!
const options = () => [
  ...document.querySelectorAll<HTMLElement>('[data-slot="icon-picker-grid"] [role="option"]'),
]

async function openPicker() {
  trigger().click()
  await flushPromises()
  await nextTick()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('IconPicker', () => {
  it('shows the server-rendered selection, named by the label and the value', async () => {
    const { wrapper } = renderPicker(
      { ...field, selected: { value: 'mdi-home', icon: '<svg viewBox="0 0 1 1"></svg>' } },
      { icon: 'mdi-home' },
    )
    await flushPromises()

    expect(trigger().getAttribute('aria-labelledby')).toBe('alfakit-icon-label alfakit-icon-value')
    expect(document.getElementById('alfakit-icon-value')?.textContent).toContain('mdi-home')
    expect(document.querySelector('[data-slot="icon-picker-value"] svg')).not.toBeNull()
    wrapper.unmount()
  })

  it('searches on the server and picks an icon with the keyboard', async () => {
    const { store, searchIcons } = renderPicker(field, { icon: null })

    await openPicker()

    expect(options().map((option) => option.getAttribute('aria-label'))).toEqual([
      'house',
      'users',
      'mdi-home',
    ])
    expect(searchIcons).toHaveBeenCalledWith(
      'icon',
      { search: '', set: null, page: 1 },
      expect.anything(),
    )

    const input = document.querySelector<HTMLInputElement>('input[role="combobox"]')!

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await nextTick()
    expect(input.getAttribute('aria-activedescendant')).toBe(options()[2]!.id)

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()

    expect(store.getValue('icon')).toBe('mdi-home')
    expect(document.querySelector('[data-slot="icon-picker-value"] svg')).not.toBeNull()
  })

  it('swaps left and right in RTL', async () => {
    setPageProps({
      alfakit: { ...panel, localization: { ...panel.localization, direction: 'rtl' } },
    })
    const { searchIcons } = renderPicker(field, { icon: null })
    searchIcons.mockResolvedValue(response(['house', 'users', 'bell', 'star']))

    await openPicker()

    const input = document.querySelector<HTMLInputElement>('input[role="combobox"]')!
    // The first arrow highlights the first icon; in RTL ArrowLeft moves forward.
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    await nextTick()
    expect(input.getAttribute('aria-activedescendant')).toBe(options()[1]!.id)

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await nextTick()
    expect(input.getAttribute('aria-activedescendant')).toBe(options()[0]!.id)

    setPageProps({ alfakit: panel })
  })

  it('filters by set, clicks an option, loads more and clears the value', async () => {
    const { store, searchIcons } = renderPicker(field, { icon: 'house' })
    searchIcons.mockResolvedValueOnce(response(['house', 'users'], true))

    await openPicker()

    expect(options()[0]!.getAttribute('aria-selected')).toBe('true')

    searchIcons.mockResolvedValueOnce(response(['bell'], false, 2))
    ;[...document.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Load more icons'))!
      .click()
    await flushPromises()

    expect(searchIcons).toHaveBeenLastCalledWith(
      'icon',
      { search: '', set: null, page: 2 },
      expect.anything(),
    )
    expect(options()).toHaveLength(3)

    const select = document.querySelector<HTMLSelectElement>('[data-slot="icon-picker-set"]')!
    select.value = 'mdi'
    select.dispatchEvent(new Event('change'))
    await flushPromises()

    expect(searchIcons).toHaveBeenLastCalledWith(
      'icon',
      { search: '', set: 'mdi', page: 1 },
      expect.anything(),
    )

    options()[1]!.click()
    await flushPromises()
    expect(store.getValue('icon')).toBe('users')

    document.querySelector<HTMLButtonElement>('[data-slot="icon-picker-clear"]')!.click()
    await flushPromises()
    expect(store.getValue('icon')).toBeNull()
  })

  it('accepts custom svg without drawing it unsanitised, and locks when read-only', async () => {
    const { store, wrapper } = renderPicker({ ...field, allowCustomSvg: true }, { icon: null })

    await openPicker()

    const textarea = document.querySelector<HTMLTextAreaElement>(
      '[data-slot="icon-picker-custom"] textarea',
    )!
    textarea.value = '<svg viewBox="0 0 1 1"><path d="M9 9"/></svg>'
    textarea.dispatchEvent(new Event('input'))
    await nextTick()
    ;[...document.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Use SVG'))!
      .click()
    await flushPromises()

    expect(store.getValue('icon')).toBe('<svg viewBox="0 0 1 1"><path d="M9 9"/></svg>')
    expect(document.getElementById('alfakit-icon-value')?.textContent).toContain('Custom SVG')
    expect(document.querySelector('[data-slot="icon-picker-value"] path[d="M9 9"]')).toBeNull()
    wrapper.unmount()
    document.body.innerHTML = ''

    renderPicker({ ...field, readOnly: true }, { icon: 'house' })
    await flushPromises()

    expect(trigger().disabled).toBe(true)
    expect(document.querySelector('[data-slot="icon-picker-clear"]')).toBeNull()
  })
})
