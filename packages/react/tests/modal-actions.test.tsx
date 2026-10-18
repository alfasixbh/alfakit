import type { ActionModalSchema, RelationManagersBlock, TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ActionList } from '../src/components/actions/action-list'
import { ActionModals } from '../src/components/actions/action-modals'
import { ListTabs } from '../src/components/table/list-tabs'
import { ContentBlockRenderer } from '../src/pages/page'
import { Wrapper, actions } from './mocks'

const baseModal = {
  width: 'md',
  autofocus: true,
  closeByClickingAway: true,
  closeByEscaping: true,
  closeButton: true,
  submitLabel: 'Submit',
  cancelLabel: 'Cancel',
} as const

function mockModals(modals: Record<string, Partial<ActionModalSchema>>) {
  const fetchMock = vi.fn(async (url: string) => {
    const action = new URL(url, 'http://localhost').searchParams.get('action') ?? ''

    return new Response(JSON.stringify({ ...baseModal, name: action, ...modals[action] }), {
      status: 200,
    })
  })
  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

describe('action modals', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    act(() => actions.store.set({ modals: [], loading: null }))
  })

  it('opens a footer action as a nested modal addressed by its path', async () => {
    const fetchMock = mockModals({
      edit: {
        heading: 'Edit post',
        extraFooterActions: [
          { type: 'Action', name: 'preview', label: 'Preview', hasModal: true, hasAction: true },
        ],
      },
      'edit>preview': { heading: 'Preview post' },
    })

    render(
      <Wrapper>
        <ActionList
          actions={[
            { type: 'Action', name: 'edit', label: 'Edit', hasModal: true, hasAction: true },
          ]}
          context={{ token: 't', component: 'table', record: 7 }}
        />
        <ActionModals />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(await screen.findByRole('heading', { name: 'Edit post' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    expect(await screen.findByRole('heading', { name: 'Preview post' })).toBeInTheDocument()

    const nested = new URL(String(fetchMock.mock.calls[1]?.[0]), 'http://localhost').searchParams
    expect(nested.get('action')).toBe('edit>preview')
    expect(nested.get('record')).toBe('7')
    expect(actions.state.modals.map((modal) => modal.context.parents ?? [])).toEqual([[], ['edit']])
  })

  it('shows the submit button on the last wizard step only', async () => {
    mockModals({
      onboard: {
        heading: 'Onboard',
        wizard: true,
        form: {
          state: {},
          components: [
            {
              type: 'Wizard',
              key: 'wizard',
              startStep: 1,
              nextActionLabel: 'Next',
              previousActionLabel: 'Back',
              schema: [
                { type: 'Step', key: 'one', label: 'One', schema: [] },
                { type: 'Step', key: 'two', label: 'Two', schema: [] },
              ],
            },
          ],
        } as unknown as ActionModalSchema['form'],
      },
    })

    render(
      <Wrapper>
        <ActionList
          actions={[{ type: 'Action', name: 'onboard', label: 'Onboard', hasModal: true }]}
          context={{ token: 't', component: 'page' }}
        />
        <ActionModals />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Onboard' }))
    await screen.findByRole('heading', { name: 'Onboard' })

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })

  it('asks for the current password and sends it with the run', async () => {
    mockModals({ purge: { heading: 'Purge', passwordConfirmation: true } })
    const execute = vi.spyOn(actions, 'execute').mockImplementation(() => undefined)

    render(
      <Wrapper>
        <ActionList
          actions={[
            { type: 'Action', name: 'purge', label: 'Purge', hasModal: true, hasAction: true },
          ]}
          context={{ token: 't', component: 'page' }}
        />
        <ActionModals />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Purge' }))

    const input = await screen.findByLabelText('Current password')
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveAttribute('autocomplete', 'current-password')

    fireEvent.change(input, { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'purge' }),
      expect.anything(),
      {},
      { password: 'secret' },
    )
  })

  it('runs "Create & create another" with the createAnother option', async () => {
    mockModals({
      create: { heading: 'Create post', createAnotherLabel: 'Create & create another' },
    })
    const execute = vi.spyOn(actions, 'execute').mockImplementation(() => undefined)

    render(
      <Wrapper>
        <ActionList
          actions={[
            { type: 'Action', name: 'create', label: 'New', hasModal: true, hasAction: true },
          ]}
          context={{ token: 't', component: 'table' }}
        />
        <ActionModals />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'New' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Create & create another' }))

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'create' }),
      expect.anything(),
      {},
      { createAnother: true },
    )
  })

  it('has no "Create & create another" button without a label', async () => {
    mockModals({ create: { heading: 'Create post' } })

    render(
      <Wrapper>
        <ActionList
          actions={[
            { type: 'Action', name: 'create', label: 'New', hasModal: true, hasAction: true },
          ]}
          context={{ token: 't', component: 'table' }}
        />
        <ActionModals />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'New' }))
    await screen.findByRole('heading', { name: 'Create post' })

    expect(screen.queryByRole('button', { name: 'Create & create another' })).toBeNull()
  })

  it('shows the password error from the server', async () => {
    mockModals({ purge: { heading: 'Purge', passwordConfirmation: true } })

    render(
      <Wrapper>
        <ActionList
          actions={[{ type: 'Action', name: 'purge', label: 'Purge', hasModal: true }]}
          context={{ token: 't', component: 'page' }}
        />
        <ActionModals />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Purge' }))
    await screen.findByLabelText('Current password')

    act(() =>
      actions.store.set((state) => ({
        ...state,
        modals: state.modals.map((modal) => ({
          ...modal,
          errors: { confirmPassword: ['The password is incorrect.'] },
        })),
      })),
    )

    expect(await screen.findByText('The password is incorrect.')).toBeInTheDocument()
    expect(screen.getByLabelText('Current password')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('list tabs', () => {
  it('marks the active tab and visits another with ?activeTab=', () => {
    window.history.replaceState(null, '', '/admin/posts?page=2&search=a')

    render(
      <Wrapper>
        <ListTabs
          tabs={[
            { key: 'all', label: 'All' },
            { key: 'published', label: 'Published', badge: 3, icon: 'check' },
          ]}
          activeTab="all"
          label="Posts"
        />
      </Wrapper>,
    )

    expect(screen.getByRole('tablist', { name: 'Posts' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Published/ })).toHaveTextContent('3')

    fireEvent.click(screen.getByRole('tab', { name: 'All' }))
    expect(router.visit).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('tab', { name: /Published/ }))

    const [url] = vi.mocked(router.visit).mock.calls[0] ?? []
    expect(String(url)).toContain('activeTab=published')
    expect(String(url)).toContain('search=a')
    expect(String(url)).not.toContain('page=2')

    window.history.replaceState(null, '', '/')
  })
})

describe('relation groups', () => {
  it('renders the managers of a group under one tab', () => {
    const table = (heading: string): TableSchema =>
      ({
        type: 'Table',
        modelLabel: 'item',
        pluralModelLabel: 'items',
        heading,
        columns: [],
        visibleColumns: [],
        filtersLayout: 'dropdown',
        recordActionsPosition: 'after-columns',
        records: [],
        emptyState: { heading: 'None', icon: 'inbox' },
      }) as unknown as TableSchema

    const block: RelationManagersBlock = {
      type: 'RelationManagers',
      key: 'relationManagers',
      managers: [
        {
          type: 'RelationManager',
          key: 'rm:notes',
          component: 'rm:notes',
          title: 'Notes',
          table: table('Notes'),
        },
        {
          type: 'RelationManager',
          key: 'rm:phones',
          component: 'rm:phones',
          title: 'Phones',
          table: table('Phones'),
        },
        {
          type: 'RelationManager',
          key: 'rm:emails',
          component: 'rm:emails',
          title: 'Emails',
          table: table('Emails'),
        },
      ],
      groups: [
        {
          key: 'group:contacts',
          title: 'Contacts',
          badge: 2,
          managers: ['rm:phones', 'rm:emails'],
        },
      ],
    }

    render(
      <Wrapper>
        <ContentBlockRenderer block={block} />
      </Wrapper>,
    )

    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Notes', 'Contacts2'])

    fireEvent.mouseDown(screen.getByRole('tab', { name: /Contacts/ }), { button: 0 })

    const panel = screen.getByRole('tabpanel')
    expect(panel).toHaveAttribute('data-slot', 'relation-group')
    expect(panel).toHaveTextContent('Phones')
    expect(panel).toHaveTextContent('Emails')
  })
})
