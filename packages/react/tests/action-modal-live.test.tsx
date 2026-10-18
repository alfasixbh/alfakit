import type { ActionModalSchema } from '@alfakit/core'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ActionList } from '../src/components/actions/action-list'
import { ActionModals } from '../src/components/actions/action-modals'
import { Wrapper, actions } from './mocks'

const modal = {
  name: 'import',
  heading: 'Import posts',
  width: 'md',
  autofocus: true,
  closeByClickingAway: true,
  closeByEscaping: true,
  closeButton: true,
  submitLabel: 'Import',
  cancelLabel: 'Cancel',
  form: {
    state: { name: '' },
    components: [
      {
        type: 'TextInput',
        key: 'name',
        name: 'name',
        statePath: 'name',
        label: 'Name',
        live: { onBlur: false, debounce: null },
      },
    ],
  },
} as unknown as ActionModalSchema

describe('action modal forms', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    act(() => actions.store.set({ modals: [], loading: null }))
  })

  // ImportAction shows the column mapping only after the upload's live refresh.
  it('renders components that a live refresh adds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const body = String(url).startsWith('/r')
          ? {
              state: { name: 'x', columnMap: { title: 'Title' } },
              components: [
                ...modal.form!.components,
                {
                  type: 'Fieldset',
                  key: 'columnMap',
                  label: 'Columns',
                  schema: [
                    {
                      type: 'TextInput',
                      key: 'columnMap.title',
                      name: 'title',
                      statePath: 'columnMap.title',
                      label: 'Title column',
                    },
                  ],
                },
              ],
            }
          : modal

        return new Response(JSON.stringify(body), { status: 200 })
      }),
    )

    render(
      <Wrapper>
        <ActionList
          actions={[
            { type: 'Action', name: 'import', label: 'Import', hasModal: true, hasAction: true },
          ]}
          context={{ token: 't', component: 'table' }}
        />
        <ActionModals />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Import' }))
    await screen.findByRole('heading', { name: 'Import posts' })
    expect(screen.queryByLabelText('Title column')).toBeNull()

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'x' } })

    expect(await screen.findByLabelText('Title column')).toBeInTheDocument()
  })
})
