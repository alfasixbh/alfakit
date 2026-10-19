import type { ActionModalSchema, StatSchema } from '@alfakit/core'
import { openDatabaseNotifications } from '@alfakit/core'
import { defineComponent, h, ref } from 'vue'
import ActionList from '../src/components/actions/ActionList.vue'
import ActionModals from '../src/components/actions/ActionModals.vue'
import NotificationActionButton from '../src/components/notifications/NotificationActionButton.vue'
import NotificationsMenu from '../src/components/notifications/NotificationsMenu.vue'
import StatCard from '../src/components/widgets/StatCard.vue'
import { provideStandalone } from '../src/context'
import { actions, flush, mountWithAlfakit, panel, setPageProps } from './mocks'

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

const buttons = (label: string) =>
  Array.from(document.body.querySelectorAll('button')).filter(
    (node) => node.textContent?.trim() === label,
  )
const button = (label: string) => buttons(label)[0]

async function settle() {
  await flush()
  await flush()
}

function mountAction(name: string, label: string) {
  return mountWithAlfakit(() => [
    h(ActionList, {
      actions: [{ type: 'Action', name, label, hasModal: true, hasAction: true }],
      context: { token: 't', component: 'page' },
    }),
    h(ActionModals),
  ])
}

describe('action modal options', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    actions.store.set({ modals: [], loading: null })
  })

  it('submits the modal with the arguments of a makeModalSubmitAction() button', async () => {
    mockModals({
      edit: {
        heading: 'Edit post',
        extraFooterActions: [
          {
            type: 'Action',
            name: 'saveAndPublish',
            label: 'Save & publish',
            submitsModal: true,
            arguments: { publish: true },
          },
        ],
      },
    })
    const execute = vi.spyOn(actions, 'execute').mockImplementation(() => undefined)

    const wrapper = mountAction('edit', 'Edit')
    button('Edit')?.click()
    await settle()
    button('Save & publish')?.click()

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'edit' }),
      expect.objectContaining({ arguments: { publish: true } }),
      {},
    )

    wrapper.unmount()
  })

  it('renders a sticky header, aligned footer and window attributes', async () => {
    mockModals({
      report: {
        heading: 'Report',
        stickyHeader: true,
        footerActionsAlignment: 'start',
        windowAttributes: { class: 'report-modal', 'data-test': 'window' },
      },
    })

    const wrapper = mountAction('report', 'Report')
    button('Report')?.click()
    await settle()

    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog?.classList.contains('report-modal')).toBe(true)
    expect(dialog?.getAttribute('data-test')).toBe('window')
    expect(dialog?.querySelector('[data-slot="dialog-header"]')?.className).toContain('sticky')
    expect(button('Submit')?.parentElement?.className).toContain('sm:justify-start')

    wrapper.unmount()
  })

  it('opens a slide-over from the start side with backdrop attributes', async () => {
    mockModals({
      filters: {
        heading: 'Filters',
        slideOver: true,
        slideOverPosition: 'start',
        overlayAttributes: { class: 'blurred-backdrop' },
      },
    })

    const wrapper = mountAction('filters', 'Filters')
    button('Filters')?.click()
    await settle()

    expect(document.body.querySelector('[role="dialog"]')?.className).toContain('left-0')
    expect(
      document.body
        .querySelector('[data-slot="sheet-overlay"]')
        ?.classList.contains('blurred-backdrop'),
    ).toBe(true)

    wrapper.unmount()
  })

  it('has no backdrop with modalClickThrough()', async () => {
    mockModals({ note: { heading: 'Note', clickThrough: true, closeByClickingAway: false } })

    const wrapper = mountAction('note', 'Note')
    button('Note')?.click()
    await settle()

    expect(document.body.textContent).toContain('Note')
    expect(document.body.querySelector('[data-slot="dialog-overlay"]')).toBeNull()

    wrapper.unmount()
  })

  it('closes the parents too with cancelParentActionsOnClose()', async () => {
    mockModals({
      edit: {
        heading: 'Edit post',
        extraFooterActions: [
          { type: 'Action', name: 'pick', label: 'Pick', hasModal: true, hasAction: true },
        ],
      },
      'edit>pick': { heading: 'Pick author', cancelParentActionsOnClose: true },
    })

    const wrapper = mountAction('edit', 'Edit')
    button('Edit')?.click()
    await settle()
    button('Pick')?.click()
    await settle()
    expect(actions.state.modals).toHaveLength(2)

    buttons('Cancel').at(-1)?.click()
    await settle()

    expect(actions.state.modals).toHaveLength(0)

    wrapper.unmount()
  })
})

describe('action buttons and groups', () => {
  it('shows the label from a breakpoint up and keeps it as the accessible name', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(ActionList, {
        actions: [
          {
            type: 'Action',
            name: 'export',
            label: 'Export',
            icon: 'download',
            labeledFrom: 'md',
            hasAction: true,
          },
        ],
        context: { token: 't', component: 'page' },
      }),
    )
    await flush()

    const node = document.body.querySelector('button[aria-label="Export"]')
    expect(node).not.toBeNull()
    expect(node?.querySelector('span.md\\:inline')?.textContent).toBe('Export')

    wrapper.unmount()
  })

  it('renders a buttonGroup() as joined buttons and dropdown(false) inline', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(ActionList, {
        actions: [
          {
            type: 'ActionGroup',
            label: 'View',
            buttonGroup: true,
            actions: [
              { type: 'Action', name: 'grid', label: 'Grid', hasAction: true },
              { type: 'Action', name: 'list', label: 'List', hasAction: true },
            ],
          },
          {
            type: 'ActionGroup',
            dropdown: false,
            actions: [{ type: 'Action', name: 'share', label: 'Share', hasAction: true }],
          },
        ],
        context: { token: 't', component: 'page' },
      }),
    )
    await flush()

    const group = document.body.querySelector('[role="group"][aria-label="View"]')
    expect(group?.getAttribute('data-slot')).toBe('button-group')
    expect(group?.querySelectorAll('button')).toHaveLength(2)
    expect(button('Share')).toBeDefined()

    wrapper.unmount()
  })
})

describe('notifications and widgets', () => {
  it('runs markAsUnread() actions', async () => {
    const onMarkAsUnread = vi.fn()
    const wrapper = mountWithAlfakit(() =>
      h(NotificationActionButton, {
        action: { name: 'unread', label: 'Mark as unread', variant: 'link', markAsUnread: true },
        onMarkAsUnread,
      }),
    )
    await flush()

    button('Mark as unread')?.click()
    expect(onMarkAsUnread).toHaveBeenCalledOnce()

    wrapper.unmount()
  })

  it('opens the notifications panel programmatically', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ notifications: [], unreadCount: 0, hasMore: false, page: 1 }),
          ),
      ),
    )
    setPageProps({ alfakit: { ...panel, databaseNotifications: { unreadCount: 0 } } })

    const wrapper = mountWithAlfakit(() => h(NotificationsMenu, { variant: 'sidebar' }))
    await flush()

    openDatabaseNotifications()
    await settle()

    expect(document.body.textContent).toContain('You have no notifications.')

    wrapper.unmount()
    setPageProps({ alfakit: panel })
  })

  it('follows the unread count of each page visit (another user after impersonating)', async () => {
    // A reactive panel, as Inertia's page props are after a visit.
    const current = ref({ ...panel, databaseNotifications: { unreadCount: 1 } })
    const Provider = defineComponent({
      setup: () => {
        provideStandalone({ panel: current, page: ref({}) as never })

        return () => h(NotificationsMenu)
      },
    })

    const wrapper = mountWithAlfakit(() => h(Provider))
    await flush()

    const bell = () => document.body.querySelector('button[aria-label^="Notifications"]')

    expect(bell()?.textContent?.trim()).toBe('1')

    current.value = { ...panel, databaseNotifications: { unreadCount: 0 } }
    await settle()

    expect(bell()?.textContent?.trim()).toBe('')

    wrapper.unmount()
  })

  it('names the modal close button once, with no stray screen-reader text', async () => {
    mockModals({ archive: { heading: 'Archive post' } })

    const wrapper = mountAction('archive', 'Archive')
    button('Archive')?.click()
    await settle()

    const dialog = document.body.querySelector('[role="dialog"]')
    const closeTexts = Array.from(dialog?.querySelectorAll('.sr-only') ?? []).filter(
      (node) => node.textContent?.trim() === 'Close',
    )

    expect(closeTexts).toHaveLength(1)
    expect(closeTexts[0]?.closest('button')).not.toBeNull()

    wrapper.unmount()
  })

  it('gives modal fields their own ids, apart from the page form behind the modal', async () => {
    mockModals({
      createOption: {
        heading: 'Create category',
        form: {
          state: { slug: '' },
          components: [
            { type: 'TextInput', key: 'slug', name: 'slug', statePath: 'slug', label: 'Slug' },
          ],
        },
      },
    })

    const wrapper = mountAction('createOption', 'New category')
    button('New category')?.click()
    await settle()

    const input = document.body.querySelector<HTMLInputElement>('[role="dialog"] input')
    const label = document.body.querySelector('[role="dialog"] label')

    expect(input?.id).toBe('alfakit-action-createOption-slug')
    expect(label?.getAttribute('for')).toBe(input?.id)

    wrapper.unmount()
  })

  it('shows a stat placeholder for an empty value', async () => {
    const stat: StatSchema = { label: 'Revenue', value: null, placeholder: 'No data yet' }
    const wrapper = mountWithAlfakit(() => h(StatCard, { stat }))
    await flush()

    expect(document.body.querySelector('[data-slot="stat-placeholder"]')?.textContent).toBe(
      'No data yet',
    )

    wrapper.unmount()
  })
})
