import type { ActionSchema } from '@alfakit/core'
import { h } from 'vue'
import ActionList from '../src/components/actions/ActionList.vue'
import ActionModals from '../src/components/actions/ActionModals.vue'
import { actions, flush, mountWithAlfakit } from './mocks'

describe('actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    actions.store.set({ modals: [], loading: null })
  })

  it('renders links, buttons and groups', () => {
    const list: ActionSchema[] = [
      {
        type: 'Action',
        name: 'create',
        label: 'New post',
        url: '/posts/create',
        icon: 'plus',
        color: 'primary',
        variant: 'button',
      },
      {
        type: 'Action',
        name: 'delete',
        label: 'Delete',
        color: 'danger',
        hasModal: true,
        hasAction: true,
      },
    ]

    const wrapper = mountWithAlfakit(() =>
      h(ActionList, {
        actions: [
          ...list,
          { type: 'ActionGroup', actions: [{ type: 'Action', name: 'x', label: 'Nested' }] },
        ],
        context: { token: 't', component: 'page' },
      }),
    )

    const link = wrapper.findAll('a').find((node) => node.text().includes('New post'))
    expect(link?.attributes('href')).toBe('/posts/create')
    expect(wrapper.findAll('button').some((node) => node.text().includes('Delete'))).toBe(true)
    expect(wrapper.find('button[aria-label="Actions"]').exists()).toBe(true)
    // Link actions cancel the size variant's `has-[>svg]:px-*`, so an icon never pads them.
    expect(
      wrapper
        .findAll('button')
        .find((node) => node.text().includes('Delete'))
        ?.classes(),
    ).toContain('has-[>svg]:px-0')

    wrapper.unmount()
  })

  it('opens a confirmation modal fetched from the server and submits it', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>(
      async () =>
        new Response(
          JSON.stringify({
            name: 'delete',
            heading: 'Delete A',
            description: 'Sure?',
            width: 'sm',
            autofocus: true,
            closeByClickingAway: true,
            closeByEscaping: true,
            closeButton: true,
            submitLabel: 'Confirm',
            cancelLabel: 'Cancel',
            requiresConfirmation: true,
          }),
          { status: 200 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const execute = vi.spyOn(actions, 'execute').mockImplementation(() => undefined)

    const wrapper = mountWithAlfakit(() => [
      h(ActionList, {
        actions: [
          { type: 'Action', name: 'delete', label: 'Delete', hasModal: true, hasAction: true },
        ],
        context: { token: 't', component: 'table', record: 1 },
      }),
      h(ActionModals),
    ])

    await wrapper
      .findAll('button')
      .find((node) => node.text().includes('Delete'))!
      .trigger('click')
    await flush()
    await flush()

    const heading = document.body.querySelector('[data-slot="dialog-title"]')
    expect(heading?.textContent).toBe('Delete A')
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('action=delete')
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('record=1')

    const confirm = Array.from(document.body.querySelectorAll('button')).find(
      (node) => node.textContent?.trim() === 'Confirm',
    )
    confirm?.click()

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'delete' }),
      expect.objectContaining({ record: 1 }),
      {},
    )

    wrapper.unmount()
  })
})
