import { FormStore, type SchemaComponent } from '@alfakit/core'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { FormProvider } from '../src/components/form/form-context'
import { SchemaRenderer } from '../src/components/schema/schema-renderer'
import { Wrapper } from './mocks'

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore({ components, state }, { token: 't', component: 'form' })

  const view = render(
    <Wrapper>
      <FormProvider store={store}>
        <SchemaRenderer components={store.state.components} />
      </FormProvider>
    </Wrapper>,
  )

  return { store, ...view }
}

describe('field behaviour', () => {
  it('keeps fields enabled while a live refresh is in flight', () => {
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

    act(() => store.store.update({ refreshing: true }))

    expect(screen.getByLabelText('Title')).not.toBeDisabled()
  })

  it('writes the colour picker value in the configured format', () => {
    const { store, container } = renderForm(
      [
        {
          type: 'ColorPicker',
          key: 'color',
          name: 'color',
          statePath: 'color',
          label: 'Colour',
          format: 'rgb',
        } as SchemaComponent,
      ],
      { color: null },
    )

    fireEvent.change(container.querySelector('input[type="color"]')!, {
      target: { value: '#ff8000' },
    })

    expect(store.getValue('color')).toBe('rgb(255, 128, 0)')
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
    expect(screen.getByRole('switch')).toHaveAttribute('aria-readonly', 'true')
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

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })

    expect(optionLabels).toHaveBeenCalledTimes(1)
    optionLabels.mockRestore()
  })

  it('shows the default placeholder in empty plain and native selects', () => {
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

    expect(screen.getByLabelText('Type')).toHaveTextContent('Select an option')
    expect(container.querySelector('select option[value=""]')).toHaveTextContent('Select an option')
  })
})
