import { FormStore, type SchemaComponent } from '@alfakit/core'
import { flushPromises } from '@vue/test-utils'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { provideForm } from '../src/components/form/form-context'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import { mountWithAlfakit } from './mocks'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore({ components, state }, { token: 't', component: 'form' })
  const Form = defineComponent({
    setup() {
      provideForm(store)

      return () => h('form', [h(SchemaRenderer, { components })])
    },
  })

  return { store, wrapper: mountWithAlfakit(() => h(Form), { attachTo: document.body }) }
}

describe('KeyValue reordering with buttons (A30)', () => {
  it('announces the new position and keeps focus on the moved row', async () => {
    const { store, wrapper } = renderForm(
      [
        {
          type: 'KeyValue',
          key: 'meta',
          name: 'meta',
          statePath: 'meta',
          label: 'Meta',
          keyLabel: 'Key',
          valueLabel: 'Value',
          addActionLabel: 'Add row',
          addable: true,
          deletable: false,
          reorderable: true,
          editableKeys: true,
          editableValues: true,
        } as SchemaComponent,
      ],
      { meta: { a: '1', b: '2', c: '3' } },
    )

    await wrapper.find('[data-index="0"] [data-item-move="down"]').trigger('click')
    await nextTick()
    await flushPromises()

    expect(store.getValue('meta')).toEqual([
      { key: 'b', value: '2' },
      { key: 'a', value: '1' },
      { key: 'c', value: '3' },
    ])
    expect(wrapper.find('[data-slot="item-move-status"]').text()).toBe('a moved to position 2 of 3')
    expect(document.activeElement).toBe(
      wrapper.find('[data-index="1"] [data-item-move="down"]').element,
    )
    wrapper.unmount()
  })
})

describe('OneTimeCodeInput (A26)', () => {
  it('keeps digits and submits the form once the code is complete', async () => {
    const { store, wrapper } = renderForm(
      [
        {
          type: 'OneTimeCodeInput',
          key: 'code',
          name: 'code',
          statePath: 'code',
          label: 'Code',
          length: 4,
          submitOnCompletion: true,
        } as SchemaComponent,
      ],
      {},
    )
    const form = wrapper.find('form').element as HTMLFormElement
    const submit = vi.fn((event: Event) => event.preventDefault())
    form.addEventListener('submit', submit)
    const input = wrapper.find('input')

    expect(input.attributes('autocomplete')).toBe('one-time-code')
    // Themed like every other input (`data-inputs` design option).
    expect(input.attributes('data-input')).toBeDefined()
    // No maxlength: the browser would cut a pasted "12 34" before the separators are dropped.
    expect(input.attributes('maxlength')).toBeUndefined()

    await input.setValue('1 2-3')
    expect(store.getValue('code')).toBe('123')
    await input.setValue('12a')
    expect(store.getValue('code')).toBe('12')
    await input.setValue('1234')
    await flushPromises()
    expect(submit).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
