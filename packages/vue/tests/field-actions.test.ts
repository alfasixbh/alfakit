import { FormStore, type SchemaComponent } from '@alfakit/core'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, shallowRef } from 'vue'
import { provideForm } from '../src/components/form/form-context'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import { mountWithAlfakit } from './mocks'

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

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore({ components, state }, { token: 't', component: 'form' })
  const Form = defineComponent({
    setup() {
      provideForm(store)
      const current = shallowRef(store.state.components)
      store.subscribe((state) => (current.value = state.components))

      return () => h(SchemaRenderer, { components: current.value })
    },
  })

  return { store, wrapper: mountWithAlfakit(() => h(Form)) }
}

afterEach(() => vi.unstubAllGlobals())

describe('field actions', () => {
  it('renders affix and hint actions and runs them with the form state', async () => {
    const bodies: Array<Record<string, unknown>> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)

        return new Response(
          JSON.stringify({ status: 'success', form: { components: [], state: { slug: 'done' } } }),
          { status: 200 },
        )
      }),
    )

    const { store, wrapper } = renderForm(
      [
        text('slug', {
          prefixActions: [{ type: 'Action', name: 'generate', label: 'Generate', hasAction: true }],
          hintActions: [{ type: 'Action', name: 'help', label: 'Help', hasAction: true }],
        }),
      ],
      { slug: 'old' },
    )

    const affix = wrapper.find('[data-slot="field-affix-actions"]')
    expect(affix.exists()).toBe(true)
    expect(affix.findAll('button').map((button) => button.text())).toEqual(['Generate'])
    expect(wrapper.text()).toContain('Help')

    await affix.find('button').trigger('click')
    await flushPromises()

    expect(bodies[0]).toMatchObject({
      component: 'field:form::slug',
      action: 'generate',
      state: { slug: 'old' },
    })
    expect(store.getValue('slug')).toBe('done')
  })
})
