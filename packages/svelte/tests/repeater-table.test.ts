import { FormStore, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import FormHarness from './FormHarness.svelte'
import Wrapper from './Wrapper.svelte'

const input = (path: string, name: string) =>
  ({
    type: 'TextInput',
    key: path,
    name,
    statePath: path,
    label: name,
    inputType: 'text',
  }) as SchemaComponent

describe('Repeater table layout', () => {
  it('renders items as rows under the column headers', async () => {
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
    const store = new FormStore(
      { components: [repeater], state: { lines: [{ product: 'Tea', qty: '2' }, { qty: '1' }] } },
      { token: 't', component: 'form' },
    )
    const { container } = render(Wrapper, { props: { component: FormHarness, props: { store } } })
    const table = container.querySelector('[data-slot="repeater-table"] table')!

    expect(
      Array.from(table.querySelectorAll('thead th')).map((th) =>
        th.textContent?.replace(/\s+/g, ''),
      ),
    ).toEqual(['Product*', 'Quantity', 'Actions'])

    const rows = table.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[1]!.querySelectorAll('td')[0]!.querySelector('input')).toBeNull()
    expect(rows[1]!.querySelectorAll('td')[1]!.className).toContain('text-end')

    await fireEvent.click(rows[0]!.querySelector('button[aria-label="Remove"]')!)
    expect(store.getValue('lines')).toEqual([{ qty: '1' }])
  })
})
