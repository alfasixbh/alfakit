import type { ActionModalSchema, ChartWidgetSchema, StatsOverviewWidgetSchema } from '@alfakit/core'
import {
  closeNotification,
  registerChartFormatters,
  registerChartPlugins,
  resetChartRegistrations,
} from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { ActionList } from '../src/components/actions/action-list'
import { ActionModals } from '../src/components/actions/action-modals'
import { showToast } from '../src/components/notifications/flash-toasts'
import { WidgetRenderer } from '../src/components/widgets/widgets-block'
import { outlineButtonColorClasses } from '../src/lib/colors'
import { Wrapper, actions, registry } from './mocks'

const created: Array<{ options: Record<string, unknown> }> = []
const registered: unknown[] = []

vi.mock('chart.js', () => {
  class Chart {
    static register(...items: unknown[]) {
      registered.push(...items)
    }

    data: unknown
    options: unknown

    constructor(_element: unknown, config: { data: unknown; options: Record<string, unknown> }) {
      this.data = config.data
      this.options = config.options
      created.push(config)
    }

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

function mockModal(modal: Partial<ActionModalSchema>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ ...baseModal, name: 'open', ...modal }), { status: 200 }),
    ),
  )
}

function openModal() {
  render(
    <Wrapper>
      <ActionList
        actions={[{ type: 'Action', name: 'open', label: 'Open', hasModal: true, hasAction: true }]}
        context={{ token: 't', component: 'page' }}
      />
      <ActionModals />
    </Wrapper>,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Open' }))
}

const emptyChart = (emptyState: ChartWidgetSchema['emptyState']): ChartWidgetSchema =>
  ({
    type: 'Chart',
    key: 'orders',
    id: 'orders',
    columnSpan: { default: 1 },
    chartType: 'bar',
    data: {},
    empty: true,
    emptyState,
  }) as ChartWidgetSchema

// Evaluate the lazily loaded chart (Chart.js) once up front so its module cost is not counted
// against a `findBy*` timeout; the widget still renders through its lazy loader.
beforeAll(async () => {
  await import('../src/components/widgets/chart')
}, 60_000)

describe('actions, notifications and widgets parity', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    created.length = 0
    registered.length = 0
    resetChartRegistrations()
    act(() => actions.store.set({ modals: [], loading: null }))
  })

  it('renders a registered component as modal content with its data as props', async () => {
    registry.register(
      'order-summary',
      ({ component }: { component: { props: { total: number } } }) => (
        <p>{`Total ${component.props.total}`}</p>
      ),
    )
    mockModal({
      heading: 'Order',
      content: [
        {
          type: 'View',
          key: 'v',
          component: 'order-summary',
          props: { total: 42 },
        } as never,
      ],
    })

    openModal()

    expect(await screen.findByText('Total 42')).toBeInTheDocument()
  })

  it('styles the "Create & create another" button from createAnotherAction()', async () => {
    mockModal({
      heading: 'Create',
      createAnotherLabel: 'Save and add another',
      createAnotherColor: 'success',
      createAnotherIcon: 'plus',
    })

    openModal()

    const button = await screen.findByRole('button', { name: 'Save and add another' })

    expect(button.className).toContain(outlineButtonColorClasses.success!.split(' ')[0])
    // Named icons load on demand (`lucide-react/dynamic`, then the icon).
    await waitFor(() => expect(button.querySelector('svg')).not.toBeNull())
  })

  it('runs chart empty-state actions through the widget context', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined)

    render(
      <Wrapper>
        <WidgetRenderer
          widget={emptyChart({
            heading: 'No orders',
            actions: [{ type: 'Action', name: 'import', label: 'Import', hasAction: true }],
          })}
        />
      </Wrapper>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Import' }))

    expect(trigger).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'import' }),
      expect.objectContaining({ component: 'widget:orders' }),
    )
  })

  it('renders a custom empty-state view with its data', async () => {
    registry.register('orders-empty', ({ cta }: { cta: string }) => <p>{cta}</p>)

    render(
      <Wrapper>
        <WidgetRenderer
          widget={emptyChart({ view: 'orders-empty', viewData: { cta: 'Import now' } })}
        />
      </Wrapper>,
    )

    expect(await screen.findByText('Import now')).toBeInTheDocument()
    expect(screen.queryByText('No data to show')).toBeNull()
  })

  it('resolves js: formatters and registers chart plugins', async () => {
    const money = (value: number) => `$${value}`
    const plugin = { id: 'datalabels' }

    registerChartFormatters({ money })
    registerChartPlugins([plugin])

    render(
      <Wrapper>
        <WidgetRenderer
          widget={
            {
              ...emptyChart(undefined),
              empty: undefined,
              data: { labels: ['a'], datasets: [{ data: [1] }] },
              options: { scales: { y: { ticks: { callback: 'js:money' } } } },
            } as ChartWidgetSchema
          }
        />
      </Wrapper>,
    )

    await screen.findByRole('img')

    const scales = created[0]!.options.scales as Record<string, { ticks: Record<string, unknown> }>

    expect(scales.y!.ticks.callback).toBe(money)
    expect(registered).toContain(plugin)
    expect(document.querySelector('[data-slot="chart-canvas"]')).not.toBeNull()
  })

  it('marks stat sparklines with theme hooks', () => {
    render(
      <Wrapper>
        <WidgetRenderer
          widget={
            {
              type: 'StatsOverviewWidget',
              key: 'stats',
              id: 'stats',
              columnSpan: { default: 1 },
              stats: [{ label: 'Orders', value: '3', chart: [1, 3, 2] }],
            } as StatsOverviewWidgetSchema
          }
        />
      </Wrapper>,
    )

    expect(document.querySelector('[data-slot="stat-chart"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="stat-chart-line"]')).not.toBeNull()
  })

  it('closes a toast with closeNotification(id)', () => {
    const dismiss = vi.spyOn(toast, 'dismiss')

    showToast({ id: 'greeting', title: 'Hello', duration: 'persistent' } as never)
    closeNotification('greeting')

    expect(dismiss).toHaveBeenCalledWith('greeting')
  })
})
