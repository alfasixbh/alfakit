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

describe('field behaviour', () => {
  it('keeps fields enabled while a live refresh is in flight', async () => {
    const { store } = renderForm(
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
    await tick()

    expect(screen.getByLabelText('Title')).not.toBeDisabled()
  })

  it('writes the colour picker value in the configured format', async () => {
    const { store, container } = renderForm(
      [
        {
          type: 'ColorPicker',
          key: 'color',
          name: 'color',
          statePath: 'color',
          label: 'Colour',
          format: 'hsl',
        } as SchemaComponent,
      ],
      { color: null },
    )

    await fireEvent.input(container.querySelector('input[type="color"]')!, {
      target: { value: '#ff0000' },
    })

    expect(store.getValue('color')).toBe('hsl(0, 100%, 50%)')
    // The colour value reads left to right, also in right-to-left languages.
    expect(container.querySelector('input#alfakit-color')).toHaveAttribute('dir', 'ltr')
  })

  it('locks read-only toggles, checkboxes and tags', () => {
    renderForm(
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

    expect(screen.getByRole('switch')).toBeDisabled()
    expect(screen.getByRole('checkbox')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull()
    expect(screen.getByLabelText('Tags')).toHaveAttribute('readonly')
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

    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(optionLabels).toHaveBeenCalledTimes(1)
    optionLabels.mockRestore()
  })

  it('lets a long selected label shrink and truncate in a narrow searchable select', () => {
    renderForm(
      [
        {
          type: 'Select',
          key: 'currency',
          name: 'currency',
          statePath: 'currency',
          label: 'Currency',
          searchable: true,
          options: [{ value: 'usd', label: 'US Dollar (USD)' }],
        } as SchemaComponent,
      ],
      { currency: 'usd' },
    )

    const label = screen.getByText('US Dollar (USD)')

    // The flex wrapper must be allowed to shrink (min-w-0), or `truncate` never applies
    // and the label spills over the next field.
    expect(label).toHaveClass('truncate')
    expect(label.parentElement).toHaveClass('min-w-0')
  })

  it('shows the default placeholder in empty plain and native selects', async () => {
    const { container } = renderForm(
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
    await tick()

    expect(container.querySelector('#alfakit-type')?.textContent).toContain('Select an option')
    expect(container.querySelector('select option[value=""]')?.textContent).toBe('Select an option')
  })
})
