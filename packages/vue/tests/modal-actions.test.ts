import type { ActionModalSchema, RelationManagersBlock, TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { h } from 'vue'
import ActionList from '../src/components/actions/ActionList.vue'
import ActionModals from '../src/components/actions/ActionModals.vue'
import ListTabs from '../src/components/table/ListTabs.vue'
import RelationManagers from '../src/pages/RelationManagers.vue'
import { actions, flush, mountWithAlfakit } from './mocks'

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
  const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>(async (input) => {
    const action = new URL(String(input), 'http://localhost').searchParams.get('action') ?? ''

    return new Response(JSON.stringify({ ...baseModal, name: action, ...modals[action] }), {
      status: 200,
    })
  })
  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

const button = (label: string) =>
  Array.from(document.body.querySelectorAll('button')).find(
    (node) => node.textContent?.trim() === label,
  )

async function settle() {
  await flush()
  await flush()
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

    const wrapper = mountWithAlfakit(() => [
      h(ActionList, {
        actions: [{ type: 'Action', name: 'edit', label: 'Edit', hasModal: true, hasAction: true }],
        context: { token: 't', component: 'table', record: 7 },
      }),
      h(ActionModals),
    ])

    button('Edit')?.click()
    await settle()
    button('Preview')?.click()
    await settle()

    const nested = new URL(String(fetchMock.mock.calls[1]?.[0]), 'http://localhost').searchParams
    expect(nested.get('action')).toBe('edit>preview')
    expect(nested.get('record')).toBe('7')
    expect(document.body.textContent).toContain('Preview post')

    wrapper.unmount()
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

    const wrapper = mountWithAlfakit(() => [
      h(ActionList, {
        actions: [{ type: 'Action', name: 'onboard', label: 'Onboard', hasModal: true }],
        context: { token: 't', component: 'page' },
      }),
      h(ActionModals),
    ])

    button('Onboard')?.click()
    await settle()

    expect(button('Submit')).toBeUndefined()

    button('Next')?.click()
    await settle()

    expect(button('Submit')).toBeDefined()

    wrapper.unmount()
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

    const wrapper = mountWithAlfakit(() => [
      h(ActionList, {
        actions: [
          { type: 'Action', name: 'create', label: 'New', hasModal: true, hasAction: true },
        ],
        context: { token: 't', component: 'table' },
      }),
      h(ActionModals),
    ])

    button('New')?.click()
    await settle()

    button('Create & create another')?.click()
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'create' }),
      expect.anything(),
      { title: 'Draft' },
      { createAnother: true },
    )

    // The runner swaps in the reloaded modal: its fresh state fills the open form.
    const open = actions.state.modals[0]!
    actions.store.set((state) => ({
      ...state,
      modals: [{ ...open, modal: { ...open.modal, form: titleForm('') } }],
    }))
    await settle()

    expect(document.body.querySelector<HTMLInputElement>('input#alfakit-title')?.value).toBe('')

    wrapper.unmount()
  })

  it('asks for the current password and sends it with the run', async () => {
    mockModals({ purge: { heading: 'Purge', passwordConfirmation: true } })
    const execute = vi.spyOn(actions, 'execute').mockImplementation(() => undefined)

    const wrapper = mountWithAlfakit(() => [
      h(ActionList, {
        actions: [
          { type: 'Action', name: 'purge', label: 'Purge', hasModal: true, hasAction: true },
        ],
        context: { token: 't', component: 'page' },
      }),
      h(ActionModals),
    ])

    button('Purge')?.click()
    await settle()

    const input = document.body.querySelector<HTMLInputElement>('input[type="password"]')
    expect(input?.getAttribute('autocomplete')).toBe('current-password')
    expect(document.body.querySelector(`label[for="${input?.id}"]`)?.textContent).toBe(
      'Current password',
    )

    input!.value = 'secret'
    input!.dispatchEvent(new Event('input'))
    await flush()
    button('Submit')?.click()

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'purge' }),
      expect.anything(),
      {},
      { password: 'secret' },
    )

    wrapper.unmount()
  })
})

describe('list tabs', () => {
  it('visits another tab with ?activeTab=', async () => {
    window.history.replaceState(null, '', '/admin/posts?page=2')

    const wrapper = mountWithAlfakit(() =>
      h(ListTabs, {
        tabs: [
          { key: 'all', label: 'All' },
          { key: 'published', label: 'Published', badge: 3 },
        ],
        activeTab: 'all',
        label: 'Posts',
      }),
    )

    expect(wrapper.find('[role="tablist"]').attributes('aria-label')).toBe('Posts')
    expect(wrapper.findAll('[role="tab"]')[0]?.attributes('aria-selected')).toBe('true')

    await wrapper.findAll('[role="tab"]')[1]!.trigger('click')

    const [url] = vi.mocked(router.visit).mock.calls.at(-1) ?? []
    expect(String(url)).toContain('activeTab=published')
    expect(String(url)).not.toContain('page=2')

    wrapper.unmount()
    window.history.replaceState(null, '', '/')
  })
})

describe('relation groups', () => {
  it('renders the managers of a group under one tab', async () => {
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

    const wrapper = mountWithAlfakit(() => h(RelationManagers, { block }))

    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual([
      'Notes',
      'Contacts 2',
    ])

    wrapper.unmount()
  })
})
