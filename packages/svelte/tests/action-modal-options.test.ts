import type { ActionModalSchema, AnyActionSchema } from '@alfakit/core'
import { openDatabaseNotifications } from '@alfakit/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import ActionList from '../src/components/actions/ActionList.svelte'
import ActionModals from '../src/components/actions/ActionModals.svelte'
import NotificationActionButton from '../src/components/notifications/NotificationActionButton.svelte'
import NotificationsMenu from '../src/components/notifications/NotificationsMenu.svelte'
import StatCard from '../src/components/widgets/StatCard.svelte'
import { actions, panel, setPageProps } from './mocks'
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

function renderList(list: AnyActionSchema[]) {
  return render(Wrapper, {
    props: {
      component: ActionList,
      props: { actions: list, context: { token: 't', component: 'page' } },
      extra: [ActionModals],
    },
  })
}

const modalAction = (name: string, label: string): AnyActionSchema[] => [
  { type: 'Action', name, label, hasModal: true, hasAction: true },
]

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

    renderList(modalAction('edit', 'Edit'))
    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await fireEvent.click(await screen.findByRole('button', { name: 'Save & publish' }))

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'edit' }),
      expect.objectContaining({ arguments: { publish: true } }),
      {},
    )
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

    renderList(modalAction('report', 'Report'))
    await fireEvent.click(screen.getByRole('button', { name: 'Report' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveClass('report-modal')
    expect(dialog).toHaveAttribute('data-test', 'window')
    expect(dialog.querySelector('[data-slot="dialog-header"]')).toHaveClass('sticky')
    expect(screen.getByRole('button', { name: 'Submit' }).parentElement).toHaveClass(
      'sm:justify-start',
    )
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

    renderList(modalAction('filters', 'Filters'))
    await fireEvent.click(screen.getByRole('button', { name: 'Filters' }))

    expect(await screen.findByRole('dialog')).toHaveClass('left-0')
    await waitFor(() =>
      expect(document.querySelector('[data-slot="dialog-overlay"]')).toHaveClass(
        'blurred-backdrop',
      ),
    )
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

    renderList(modalAction('edit', 'Edit'))
    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await fireEvent.click(await screen.findByRole('button', { name: 'Pick' }))
    await waitFor(() => expect(actions.state.modals).toHaveLength(2))

    await fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' }).at(-1)!)

    await waitFor(() => expect(actions.state.modals).toHaveLength(0))
  })
})

describe('action buttons and groups', () => {
  it('shows the label from a breakpoint up and keeps it as the accessible name', () => {
    renderList([
      {
        type: 'Action',
        name: 'export',
        label: 'Export',
        icon: 'download',
        labeledFrom: 'md',
        hasAction: true,
      },
    ])

    expect(screen.getByRole('button', { name: 'Export' })).toHaveAttribute('aria-label', 'Export')
    expect(screen.getByText('Export')).toHaveClass('hidden', 'md:inline')
  })

  it('renders a buttonGroup() as joined buttons and dropdown(false) inline', () => {
    renderList([
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
    ])

    const group = screen.getByRole('group', { name: 'View' })
    expect(group).toHaveAttribute('data-slot', 'button-group')
    expect(group.querySelectorAll('button')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
  })
})

describe('notifications and widgets', () => {
  it('runs markAsUnread() actions', async () => {
    const onMarkAsUnread = vi.fn()

    render(Wrapper, {
      props: {
        component: NotificationActionButton,
        props: {
          action: { name: 'unread', label: 'Mark as unread', variant: 'link', markAsUnread: true },
          onMarkAsUnread,
        },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Mark as unread' }))

    expect(onMarkAsUnread).toHaveBeenCalledOnce()
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

    render(Wrapper, { props: { component: NotificationsMenu, props: { variant: 'sidebar' } } })

    openDatabaseNotifications()

    expect(await screen.findByText('You have no notifications.')).toBeInTheDocument()

    setPageProps({ alfakit: panel })
  })

  it('shows a stat placeholder for an empty value', () => {
    render(Wrapper, {
      props: {
        component: StatCard,
        props: { stat: { label: 'Revenue', value: null, placeholder: 'No data yet' } },
      },
    })

    expect(screen.getByText('No data yet')).toHaveAttribute('data-slot', 'stat-placeholder')
  })
})
