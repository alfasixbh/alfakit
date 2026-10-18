import type { ActionModalSchema, RelationManagersBlock, TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/svelte'
import { fireEvent, render, screen } from '@testing-library/svelte'
import ActionList from '../src/components/actions/ActionList.svelte'
import ActionModals from '../src/components/actions/ActionModals.svelte'
import ListTabs from '../src/components/table/ListTabs.svelte'
import RelationManagers from '../src/pages/RelationManagers.svelte'
import { actions } from './mocks'
import Wrapper from './Wrapper.svelte'

const baseModal = {
  width: 'md',
  autofocus: true,
  closeByClickingAway: true,
  closeByEscaping: true,
  closeButton: true,
  submitLabel: 'Submit',
  cancelLabel: 'Cancel',
}

function mockModals(modals: Record<string, Partial<ActionModalSchema>>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const action = new URL(String(input), 'http://localhost').searchParams.get('action') ?? ''

    return new Response(JSON.stringify({ ...baseModal, name: action, ...modals[action] }), {
      status: 200,
    })
  })
  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

function renderActions(name: string, label: string) {
  return render(Wrapper, {
    props: {
      component: ActionList,
      props: {
        actions: [{ type: 'Action', name, label, hasModal: true, hasAction: true }],
        context: { token: 't', component: 'table', record: 7 },
      },
      extra: [ActionModals],
    },
  })
}

describe('action modals', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    actions.store.set({ modals: [], loading: null })
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

    renderActions('edit', 'Edit')

    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(
      await screen.findByText('Edit post', { selector: '[data-slot="dialog-title"]' }),
    ).toBeInTheDocument()

    await fireEvent.click(await screen.findByRole('button', { name: 'Preview' }))
    expect(
      await screen.findByText('Preview post', { selector: '[data-slot="dialog-title"]' }),
    ).toBeInTheDocument()

    const nested = new URL(String(fetchMock.mock.calls[1]?.[0]), 'http://localhost').searchParams
    expect(nested.get('action')).toBe('edit>preview')
    expect(nested.get('record')).toBe('7')
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

    renderActions('onboard', 'Onboard')

    await fireEvent.click(screen.getByRole('button', { name: 'Onboard' }))
    expect(
      await screen.findByText('Onboard', { selector: '[data-slot="dialog-title"]' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull()

    await fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })

  it('runs "Create & create another" and refills the form when the modal reloads', async () => {
    const titleForm = (title: string) =>
      ({
        components: [
          {
            type: 'TextInput',
            key: 'title',
            name: 'title',
            statePath: 'title',
            label: 'Title',
            inputType: 'text',
          },
        ],
        state: { title },
      }) as unknown as ActionModalSchema['form']
    mockModals({
      create: {
        heading: 'Create post',
        createAnotherLabel: 'Create & create another',
        form: titleForm('Draft'),
      },
    })
    const execute = vi.spyOn(actions, 'execute').mockImplementation(() => undefined)

    renderActions('create', 'New')

    await fireEvent.click(screen.getByRole('button', { name: 'New' }))
    await fireEvent.click(await screen.findByRole('button', { name: 'Create & create another' }))

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'create' }),
      expect.anything(),
      { title: 'Draft' },
      { createAnother: true },
    )

    const open = actions.state.modals[0]!
    actions.store.set((state) => ({
      ...state,
      modals: [{ ...open, modal: { ...open.modal, form: titleForm('') } }],
    }))

    await vi.waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue(''))
  })

  it('has no "Create & create another" button without a label', async () => {
    mockModals({ create: { heading: 'Create post' } })

    renderActions('create', 'New')
    await fireEvent.click(screen.getByRole('button', { name: 'New' }))
    await screen.findByRole('heading', { name: 'Create post' })

    expect(screen.queryByRole('button', { name: 'Create & create another' })).toBeNull()
  })

  it('asks for the current password and sends it with the run', async () => {
    mockModals({ purge: { heading: 'Purge', passwordConfirmation: true } })
    const execute = vi.spyOn(actions, 'execute').mockImplementation(() => undefined)

    renderActions('purge', 'Purge')

    await fireEvent.click(screen.getByRole('button', { name: 'Purge' }))

    const input = await screen.findByLabelText('Current password')
    expect(input).toHaveAttribute('autocomplete', 'current-password')

    await fireEvent.input(input, { target: { value: 'secret' } })
    await fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'purge' }),
      expect.anything(),
      {},
      { password: 'secret' },
    )
  })
})

describe('list tabs', () => {
  it('visits another tab with ?activeTab=', async () => {
    window.history.replaceState(null, '', '/admin/posts?page=2')

    render(Wrapper, {
      props: {
        component: ListTabs,
        props: {
          tabs: [
            { key: 'all', label: 'All' },
            { key: 'published', label: 'Published', badge: 3 },
          ],
          activeTab: 'all',
          label: 'Posts',
        },
      },
    })

    expect(screen.getByRole('tablist', { name: 'Posts' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')

    await fireEvent.click(screen.getByRole('tab', { name: /Published/ }))

    const [url] = vi.mocked(router.visit).mock.calls.at(-1) ?? []
    expect(String(url)).toContain('activeTab=published')
    expect(String(url)).not.toContain('page=2')

    window.history.replaceState(null, '', '/')
  })
})

describe('relation groups', () => {
  it('renders the managers of a group under one tab', () => {
    const table = (heading: string) =>
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

    render(Wrapper, { props: { component: RelationManagers, props: { block } } })

    expect(
      screen.getAllByRole('tab').map((tab) => tab.textContent?.replace(/\s+/g, ' ').trim()),
    ).toEqual(['Notes', 'Contacts 2'])
  })
})
