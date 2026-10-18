import { FormStore, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormProvider } from '../src/components/form/form-context'
import { SchemaRenderer } from '../src/components/schema/schema-renderer'
import { Wrapper } from './mocks'

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
    // The server left out a hidden field: its cell stays empty instead of shifting.
    { key: '1', schema: [input('lines.1.qty', 'qty')] },
  ],
  template: [input('lines.__INDEX__.product', 'product'), input('lines.__INDEX__.qty', 'qty')],
  templateState: { product: null, qty: null },
  addable: true,
  deletable: true,
  reorderable: true,
  addActionLabel: 'Add line',
  table: [
    { label: 'Product', name: 'product', required: true, width: '60%' },
    { label: 'Quantity', name: 'qty', alignment: 'end', hiddenLabel: true },
  ],
} as SchemaComponent

describe('Repeater table layout', () => {
  it('renders items as rows under the column headers', () => {
    const store = new FormStore(
      { components: [repeater], state: { lines: [{ product: 'Tea', qty: '2' }, { qty: '1' }] } },
      { token: 't', component: 'form' },
    )
    const { container } = render(
      <Wrapper>
        <FormProvider store={store}>
          <SchemaRenderer components={[repeater]} />
        </FormProvider>
      </Wrapper>,
    )

    const table = container.querySelector('[data-slot="repeater-table"] table')!
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent)

    expect(headers).toEqual(['Product*', 'Quantity', 'Actions'])
    expect(table.querySelector('thead th')?.getAttribute('style')).toContain('width: 60%')
    expect(table.querySelectorAll('thead th span.sr-only')[0]?.textContent).toBe('Quantity')

    const rows = table.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[1]?.querySelectorAll('td')[0]?.querySelector('input')).toBeNull()
    expect(rows[1]?.querySelectorAll('td')[1]?.className).toContain('text-end')

    // Inputs keep their accessible names.
    expect(screen.getAllByLabelText('qty')).toHaveLength(2)

    fireEvent.click(within(rows[0] as HTMLElement).getByRole('button', { name: 'Remove' }))
    expect(store.getValue('lines')).toEqual([{ qty: '1' }])
  })

  it('renders repeatable entries as a table', () => {
    const { container } = render(
      <Wrapper>
        <SchemaRenderer
          components={[
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
          ]}
        />
      </Wrapper>,
    )

    const table = container.querySelector('[data-slot="repeatable-entry-table"] table')!

    expect(table.querySelector('thead th')?.textContent).toBe('Product')
    expect(table.querySelector('tbody td')?.textContent).toContain('Tea')
  })
})
