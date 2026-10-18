import { FormStore, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import FormElementHarness from './FormElementHarness.svelte'
import Wrapper from './Wrapper.svelte'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

function renderForm(
  components: SchemaComponent[],
  state: Record<string, unknown>,
  onsubmit?: (event: SubmitEvent) => void,
) {
  const store = new FormStore({ components, state }, { token: 't', component: 'form' })
  const view = render(Wrapper, {
    props: { component: FormElementHarness, props: { store, onsubmit } },
  })

  return { store, ...view }
}

describe('KeyValue reordering with buttons (A30)', () => {
  it('announces the new position and keeps focus on the moved row', async () => {
    const { store, container } = renderForm(
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

    await fireEvent.click(container.querySelector('[data-index="0"] [data-item-move="down"]')!)

    expect(store.getValue('meta')).toEqual([
      { key: 'b', value: '2' },
      { key: 'a', value: '1' },
      { key: 'c', value: '3' },
    ])
    expect(container.querySelector('[data-slot="item-move-status"]')?.textContent).toBe(
      'a moved to position 2 of 3',
    )
    await waitFor(() =>
      expect(document.activeElement).toBe(
        container.querySelector('[data-index="1"] [data-item-move="down"]'),
      ),
    )
  })
})

describe('OneTimeCodeInput (A26)', () => {
  it('keeps digits and submits the form once the code is complete', async () => {
    const submit = vi.fn((event: SubmitEvent) => event.preventDefault())
    const { store } = renderForm(
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
      submit,
    )
    const input = screen.getByLabelText('Code')

    expect(input).toHaveAttribute('autocomplete', 'one-time-code')

    await fireEvent.input(input, { target: { value: '12a' } })
    expect(store.getValue('code')).toBe('12')
    await fireEvent.input(input, { target: { value: '1234' } })
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
  })
})
