import type { ActionModalSchema, ChartWidgetSchema, StatsOverviewWidgetSchema } from '@alfakit/core'
import {
  closeNotification,
  registerChartFormatters,
  registerChartPlugins,
  resetChartRegistrations,
} from '@alfakit/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { toast } from 'svelte-sonner'
import ActionList from '../src/components/actions/ActionList.svelte'
import ActionModals from '../src/components/actions/ActionModals.svelte'
import { showToast } from '../src/components/notifications/toast'
import ChartWidget from '../src/components/widgets/ChartWidget.svelte'
import StatsOverviewWidget from '../src/components/widgets/StatsOverviewWidget.svelte'
import { outlineButtonColorClasses } from '../src/lib/colors'
import { actions, registry } from './mocks'
import ParityProbe from './ParityProbe.svelte'
import Wrapper from './Wrapper.svelte'

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
}

function mockModal(modal: Partial<ActionModalSchema>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ ...baseModal, name: 'open', ...modal }), { status: 200 }),
    ),
  )
}

async function openModal() {
  render(Wrapper, {
    props: {
      component: ActionList,
      props: {
        actions: [{ type: 'Action', name: 'open', label: 'Open', hasModal: true, hasAction: true }],
        context: { token: 't', component: 'page' },
      },
      extra: [ActionModals],
    },
  })

  await fireEvent.click(screen.getByRole('button', { name: 'Open' }))
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

describe('actions, notifications and widgets parity', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    created.length = 0
    registered.length = 0
    resetChartRegistrations()
    actions.store.set({ modals: [], loading: null })
    registry.register('parity-probe', ParityProbe)
  })

  it('renders a registered component as modal content with its data', async () => {
    mockModal({
      heading: 'Order',
      content: [
        { type: 'View', key: 'v', component: 'parity-probe', props: { total: 42 } } as never,
      ],
    })

    await openModal()

    expect(await screen.findByText('Total 42')).toBeInTheDocument()
  })

  it('styles the "Create & create another" button from createAnotherAction()', async () => {
    mockModal({
      heading: 'Create',
      createAnotherLabel: 'Save and add another',
      createAnotherColor: 'success',
      createAnotherIcon: 'plus',
    })

    await openModal()

    const another = await screen.findByRole('button', { name: 'Save and add another' })

    expect(another.className).toContain(outlineButtonColorClasses.success!.split(' ')[0])
    // Icons load on demand.
    await waitFor(() => expect(another.querySelector('svg')).not.toBeNull())
  })

  it('runs chart empty-state actions through the widget context', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined)

    render(Wrapper, {
      props: {
        component: ChartWidget,
        props: {
          widget: emptyChart({
            heading: 'No orders',
            actions: [{ type: 'Action', name: 'import', label: 'Import', hasAction: true }],
          }),
        },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Import' }))

    expect(trigger).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'import' }),
      expect.objectContaining({ component: 'widget:orders' }),
    )
  })

  it('renders a custom empty-state view with its data', () => {
    render(Wrapper, {
      props: {
        component: ChartWidget,
        props: { widget: emptyChart({ view: 'parity-probe', viewData: { cta: 'Import now' } }) },
      },
    })

    expect(screen.getByText('Import now')).toBeInTheDocument()
    expect(screen.queryByText('No data to show')).toBeNull()
  })

  it('resolves js: formatters and registers chart plugins', () => {
    const money = (value: number) => `$${value}`
    const plugin = { id: 'datalabels' }

    registerChartFormatters({ money })
    registerChartPlugins([plugin])

    render(Wrapper, {
      props: {
        component: ChartWidget,
        props: {
          widget: {
            ...emptyChart(undefined),
            empty: undefined,
            data: { labels: ['a'], datasets: [{ data: [1] }] },
            options: { scales: { y: { ticks: { callback: 'js:money' } } } },
          } as ChartWidgetSchema,
        },
      },
    })

    const scales = created[0]!.options.scales as Record<string, { ticks: Record<string, unknown> }>

    expect(scales.y!.ticks.callback).toBe(money)
    expect(registered).toContain(plugin)
    expect(document.querySelector('[data-slot="chart-canvas"]')).not.toBeNull()
  })

  it('marks stat sparklines with theme hooks', () => {
    render(Wrapper, {
      props: {
        component: StatsOverviewWidget,
        props: {
          widget: {
            type: 'StatsOverviewWidget',
            key: 'stats',
            id: 'stats',
            columnSpan: { default: 1 },
            stats: [{ label: 'Orders', value: '3', chart: [1, 3, 2] }],
          } as StatsOverviewWidgetSchema,
        },
      },
    })

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
