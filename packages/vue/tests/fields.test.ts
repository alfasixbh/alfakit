import { FormStore, type SchemaComponent } from '@alfakit/core'
import { flushPromises } from '@vue/test-utils'
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

describe('field behaviour', () => {
  it('keeps fields enabled while a live refresh is in flight', async () => {
    const { store, wrapper } = renderForm(
      [
        {
          type: 'TextInput',
          key: 'title',
          name: 'title',
          statePath: 'title',
          label: 'Title',
          inputType: 'text',
        } as SchemaComponent,
      ],
      { title: '' },
    )

    store.store.update({ refreshing: true })
    await nextTick()

    expect(wrapper.find('input#alfakit-title').attributes('disabled')).toBeUndefined()
  })

  it('writes the colour picker value in the configured format', async () => {
    const { store, wrapper } = renderForm(
      [
        {
          type: 'ColorPicker',
          key: 'color',
          name: 'color',
          statePath: 'color',
          label: 'Colour',
          format: 'rgba',
        } as SchemaComponent,
      ],
      { color: 'rgba(0, 0, 0, 0.5)' },
    )

    await wrapper.find('input[type="color"]').setValue('#ff8000')

    expect(store.getValue('color')).toBe('rgba(255, 128, 0, 0.5)')
    // The colour value reads left to right, also in right-to-left languages.
    expect(wrapper.find('input#alfakit-color').attributes('dir')).toBe('ltr')
  })

  it('locks read-only toggles, checkboxes and tags', () => {
    const { wrapper } = renderForm(
      [
        { type: 'Toggle', key: 'on', name: 'on', statePath: 'on', label: 'On', readOnly: true },
        { type: 'Checkbox', key: 'ok', name: 'ok', statePath: 'ok', label: 'Ok', readOnly: true },
        {
          type: 'TagsInput',
          key: 'tags',
          name: 'tags',
          statePath: 'tags',
          label: 'Tags',
          splitKeys: ['Enter'],
          readOnly: true,
        },
      ] as SchemaComponent[],
      { on: true, ok: false, tags: ['a', 'b'] },
    )

    expect(wrapper.find('[role="switch"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[role="checkbox"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('button[aria-label="Remove"]').exists()).toBe(false)
    expect(wrapper.find('input#alfakit-tags').attributes('readonly')).toBeDefined()
  })

  it('asks for a missing select label only once', async () => {
    const optionLabels = vi.spyOn(FormStore.prototype, 'optionLabels').mockResolvedValue({})

    renderForm(
      [
        {
          type: 'Select',
          key: 'author',
          name: 'author',
          statePath: 'author',
          label: 'Author',
          searchable: true,
          options: [],
        } as SchemaComponent,
      ],
      { author: 'deleted-id' },
    )

    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(optionLabels).toHaveBeenCalledTimes(1)
    optionLabels.mockRestore()
  })

  it('shows the default placeholder in empty plain and native selects', async () => {
    const { wrapper } = renderForm(
      [
        {
          type: 'Select',
          key: 'type',
          name: 'type',
          statePath: 'type',
          label: 'Type',
          options: [{ value: 'a', label: 'A' }],
        } as SchemaComponent,
        {
          type: 'Select',
          key: 'kind',
          name: 'kind',
          statePath: 'kind',
          label: 'Kind',
          native: true,
          selectablePlaceholder: true,
          options: [{ value: 'a', label: 'A' }],
        } as SchemaComponent,
      ],
      { type: null, kind: null },
    )
    await nextTick()

    expect(wrapper.find('#alfakit-type').text()).toContain('Select an option')
    expect(wrapper.find('select option[value=""]').text()).toBe('Select an option')
  })
})
