import type { ActionModalSchema, ChartWidgetSchema, StatsOverviewWidgetSchema } from '@alfakit/core'
import { openDatabaseNotifications } from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ActionList } from '../src/components/actions/action-list'
import { ActionModals } from '../src/components/actions/action-modals'
import { NotificationActionButton } from '../src/components/notifications/flash-toasts'
import { NotificationsMenu } from '../src/components/notifications/notifications-menu'
import { StatsOverviewWidget } from '../src/components/widgets/stats-overview'
import { WidgetRenderer } from '../src/components/widgets/widgets-block'
import { Wrapper, actions, panel, setPageProps } from './mocks'

vi.mock('chart.js', () => {
  class Chart {
    static register() {}
    update() {}
    destroy() {}
  }

  return { Chart, registerables: [] }
})

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
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? (JSON.parse(String(init.body)) as { action?: string }) : {}
    const action = new URL(url, 'http://localhost').searchParams.get('action') ?? body.action ?? ''

    return new Response(JSON.stringify({ ...baseModal, name: action, ...modals[action] }), {
      status: 200,
    })
  })
  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

function renderAction(name: string, label: string) {
  return render(
    <Wrapper>
      <ActionList
        actions={[{ type: 'Action', name, label, hasModal: true, hasAction: true }]}
        context={{ token: 't', component: 'page' }}
      />
      <ActionModals />
    </Wrapper>,
  )
}

describe('action modal options', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    act(() => actions.store.set({ modals: [], loading: null }))
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

    renderAction('edit', 'Edit')
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Save & publish' }))

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

    renderAction('report', 'Report')
    fireEvent.click(screen.getByRole('button', { name: 'Report' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveClass('report-modal')
    expect(dialog).toHaveAttribute('data-test', 'window')
    expect(dialog.querySelector('[data-slot="dialog-header"]')).toHaveClass('sticky')
    expect(screen.getByRole('button', { name: 'Submit' }).parentElement).toHaveClass(
      'sm:justify-start',
    )
  })

  it('names the modal close button once, with no stray screen-reader text', async () => {
    mockModals({ archive: { heading: 'Archive post' } })

    renderAction('archive', 'Archive')
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))

    const dialog = await screen.findByRole('dialog')
    const closeTexts = Array.from(dialog.querySelectorAll('.sr-only')).filter(
      (node) => node.textContent?.trim() === 'Close',
    )

    expect(closeTexts).toHaveLength(1)
    expect(closeTexts[0]?.closest('button')).not.toBeNull()
  })

  it('keeps a long heading clear of the close button', async () => {
    mockModals({
      archive: { heading: 'Delete Hello Svelte World edited, a long heading' },
      keep: { heading: 'Keep', closeButton: false },
    })

    renderAction('archive', 'Archive')
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog.querySelector('[data-slot="dialog-header"]')).toHaveClass('pe-6')
  })

  it('opens a slide-over from the start side and puts attributes on the backdrop', async () => {
    mockModals({
      filters: {
        heading: 'Filters',
        slideOver: true,
        slideOverPosition: 'start',
        overlayAttributes: { class: 'blurred-backdrop' },
      },
    })

    renderAction('filters', 'Filters')
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))

    const sheet = await screen.findByRole('dialog')
    expect(sheet).toHaveClass('left-0')
    await waitFor(() =>
      expect(document.querySelector('[data-slot="sheet-overlay"]')).toHaveClass('blurred-backdrop'),
    )
  })

  it('has no backdrop with modalClickThrough()', async () => {
    mockModals({ note: { heading: 'Note', clickThrough: true, closeByClickingAway: false } })

    renderAction('note', 'Note')
    fireEvent.click(screen.getByRole('button', { name: 'Note' }))

    await screen.findByRole('dialog')
    expect(document.querySelector('[data-slot="dialog-overlay"]')).toBeNull()
  })

  it('hides the parent while a nested modal is open, as Filament does', async () => {
    mockModals({
      edit: {
        heading: 'Edit post',
        extraFooterActions: [
          { type: 'Action', name: 'pick', label: 'Pick', hasModal: true, hasAction: true },
        ],
      },
      'edit>pick': { heading: 'Pick author' },
    })

    renderAction('edit', 'Edit')
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Pick' }))

    expect(await screen.findByRole('heading', { name: 'Pick author' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Edit post' })).toBeNull())

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' }).at(-1)!)

    expect(await screen.findByRole('heading', { name: 'Edit post' })).toBeInTheDocument()
  })

  it('keeps the parent visible under a child with overlayParentActions()', async () => {
    mockModals({
      edit: {
        heading: 'Edit post',
        extraFooterActions: [
          { type: 'Action', name: 'pick', label: 'Pick', hasModal: true, hasAction: true },
        ],
      },
      'edit>pick': { heading: 'Pick author', overlayParent: true },
    })

    renderAction('edit', 'Edit')
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Pick' }))

    expect(await screen.findByRole('heading', { name: 'Pick author' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Edit post', hidden: true })).toBeInTheDocument()
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

    renderAction('edit', 'Edit')
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Pick' }))
    await screen.findByRole('heading', { name: 'Pick author' })

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' }).at(-1)!)

    await waitFor(() => expect(actions.state.modals).toHaveLength(0))
  })
})

describe('action buttons and groups', () => {
  it('shows the label from a breakpoint up and keeps it as the accessible name', () => {
    render(
      <Wrapper>
        <ActionList
          actions={[
            {
              type: 'Action',
              name: 'export',
              label: 'Export',
              icon: 'download',
              labeledFrom: 'md',
              hasAction: true,
            },
          ]}
          context={{ token: 't', component: 'page' }}
        />
      </Wrapper>,
    )

    const button = screen.getByRole('button', { name: 'Export' })
    expect(button).toHaveAttribute('aria-label', 'Export')
    expect(screen.getByText('Export')).toHaveClass('hidden', 'md:inline')
  })

  it('renders a buttonGroup() as joined buttons and dropdown(false) inline', () => {
    render(
      <Wrapper>
        <ActionList
          actions={[
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
          ]}
          context={{ token: 't', component: 'page' }}
        />
      </Wrapper>,
    )

    const group = screen.getByRole('group', { name: 'View' })
    expect(group).toHaveAttribute('data-slot', 'button-group')
    expect(group.querySelectorAll('button')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
  })
})

describe('notifications', () => {
  it('runs markAsUnread() actions', () => {
    const onMarkAsUnread = vi.fn()

    render(
      <Wrapper>
        <NotificationActionButton
          action={{ name: 'unread', label: 'Mark as unread', variant: 'link', markAsUnread: true }}
          onMarkAsUnread={onMarkAsUnread}
        />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Mark as unread' }))

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

    render(
      <Wrapper>
        <NotificationsMenu variant="sidebar" />
      </Wrapper>,
    )

    act(() => openDatabaseNotifications())

    expect(await screen.findByText('You have no notifications.')).toBeInTheDocument()

    setPageProps({ alfakit: panel })
  })
})

describe('widgets', () => {
  it('shows a stat placeholder for an empty value', () => {
    const widget = {
      type: 'StatsOverviewWidget',
      id: 'stats',
      stats: [{ label: 'Revenue', value: null, placeholder: 'No data yet' }],
    } as unknown as StatsOverviewWidgetSchema

    render(
      <Wrapper>
        <StatsOverviewWidget widget={widget} />
      </Wrapper>,
    )

    expect(screen.getByText('No data yet')).toHaveAttribute('data-slot', 'stat-placeholder')
  })

  it('describes a chart with its assistive content', async () => {
    const widget = {
      type: 'Chart',
      key: 'sales',
      id: 'sales',
      columnSpan: { default: 1 },
      chartType: 'bar',
      heading: 'Sales',
      data: { labels: ['Jan'], datasets: [{ data: [3] }] },
      assistiveContent: '<table><tr><td>Jan</td><td>3</td></tr></table>',
    } as unknown as ChartWidgetSchema

    render(
      <Wrapper>
        <WidgetRenderer widget={widget} />
      </Wrapper>,
    )

    const canvas = await screen.findByRole('img', { name: 'Sales' })
    const description = document.getElementById(canvas.getAttribute('aria-describedby') ?? '')

    expect(description).toHaveClass('sr-only')
    expect(description?.querySelector('table')).not.toBeNull()
  })
})
