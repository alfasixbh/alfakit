import { FormStore, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { FormProvider } from '../src/components/form/form-context'
import { SchemaRenderer } from '../src/components/schema/schema-renderer'
import { Wrapper } from './mocks'

const response = {
  labels: { 1: 'Ada' },
  table: {
    type: 'Table',
    modelLabel: 'user',
    pluralModelLabel: 'users',
    columns: [{ type: 'TextColumn', name: 'name', label: 'Name' }],
    visibleColumns: ['name'],
    filtersLayout: 'dropdown',
    recordActionsPosition: 'after-columns',
    searchPlaceholder: 'Search',
    searchDebounce: 0,
    emptyState: { heading: 'No users' },
    records: [{ key: 1, selectable: true, cells: { name: { state: 'Ada', disabled: true } } }],
    pagination: {
      currentPage: 1,
      lastPage: 1,
      perPage: 10,
      total: 1,
      from: 1,
      to: 1,
      pageOptions: [10],
    },
  },
}

const picker = {
  type: 'ModalTableSelect',
  key: 'user',
  name: 'user',
  statePath: 'user',
  label: 'User',
  modalHeading: 'Search users',
  modalDescription: 'Only &lt;active&gt; users',
  modalSubmitActionLabel: 'Use user',
  modalWidth: '5xl',
  selectActionLabel: 'Pick a user',
  selectActionIcon: 'search',
  tableStateIdentifier: 'table',
} as unknown as SchemaComponent

afterEach(() => vi.unstubAllGlobals())

describe('ModalTableSelect selectAction()', () => {
  it('uses the customised button, heading, description, width and confirm label', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(response))),
    )
    const store = new FormStore(
      { components: [picker], state: { user: null } },
      { token: 't', component: 'form', optionsUrl: '/o' },
    )

    render(
      <Wrapper>
        <FormProvider store={store}>
          <SchemaRenderer components={store.state.components} />
        </FormProvider>
      </Wrapper>,
    )

    // The picker's code loads lazily.
    const button = await screen.findByRole('button', { name: 'Pick a user' })

    fireEvent.click(button)

    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByText('Search users')).toBeInTheDocument()
    expect(within(dialog).getByText('Only <active> users')).toBeInTheDocument()
    expect(dialog.className).toContain('sm:max-w-5xl')

    fireEvent.click(await within(dialog).findByRole('radio', { name: 'Select Ada' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Use user' }))

    expect(store.getValue('user')).toBe('1')
  })
})
