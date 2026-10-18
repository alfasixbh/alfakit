import { FormStore, type SchemaComponent } from '@alfakit/core'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { provideForm } from '../src/components/form/form-context'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import { mountWithAlfakit } from './mocks'

const input = (path: string, name: string) =>
  ({
    type: 'TextInput',
    key: path,
    name,
    statePath: path,
    label: name,
    inputType: 'text',
  }) as SchemaComponent

const repeater = {
  type: 'Repeater',
  key: 'lines',
  name: 'lines',
  statePath: 'lines',
  label: 'Lines',
  items: [
    { key: '0', schema: [input('lines.0.product', 'product'), input('lines.0.qty', 'qty')] },
    { key: '1', schema: [input('lines.1.qty', 'qty')] },
  ],
  template: [],
  templateState: {},
  addable: true,
  deletable: true,
  reorderable: false,
  addActionLabel: 'Add line',
  table: [
    { label: 'Product', name: 'product', required: true },
    { label: 'Quantity', name: 'qty', alignment: 'end' },
  ],
} as SchemaComponent

describe('Repeater table layout', () => {
  it('renders items as rows under the column headers', async () => {
    const store = new FormStore(
      { components: [repeater], state: { lines: [{ product: 'Tea', qty: '2' }, { qty: '1' }] } },
      { token: 't', component: 'form' },
    )
    const Form = defineComponent({
      setup() {
        provideForm(store)

        return () => h(SchemaRenderer, { components: [repeater] })
      },
    })
    const wrapper = mountWithAlfakit(() => h(Form))
    const table = wrapper.find('[data-slot="repeater-table"] table')

    expect(table.findAll('thead th').map((th) => th.text())).toEqual([
      'Product*',
      'Quantity',
      'Actions',
    ])

    const rows = table.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[1]!.findAll('td')[0]!.find('input').exists()).toBe(false)
    expect(rows[1]!.findAll('td')[1]!.classes()).toContain('text-end')

    await rows[0]!.find('button[aria-label="Remove"]').trigger('click')
    expect(store.getValue('lines')).toEqual([{ qty: '1' }])
  })

  it('renders repeatable entries as a table', () => {
    const wrapper = mountWithAlfakit(() =>
      h(SchemaRenderer, {
        components: [
          {
            type: 'RepeatableEntry',
            key: 'lines',
            name: 'lines',
            label: 'Lines',
            contained: true,
            table: [{ label: 'Product', name: 'product' }],
            items: [
              [
                {
                  type: 'TextEntry',
                  key: 'product',
                  name: 'product',
                  label: 'product',
                  state: 'Tea',
                },
              ],
            ],
          } as SchemaComponent,
        ],
      }),
    )

    const table = wrapper.find('[data-slot="repeatable-entry-table"] table')
    expect(table.find('thead th').text()).toBe('Product')
    expect(table.find('tbody td').text()).toContain('Tea')
  })
})
