import type { ActionModalSchema, ChartWidgetSchema, StatsOverviewWidgetSchema } from '@alfakit/core'
import {
  closeNotification,
  registerChartFormatters,
  registerChartPlugins,
  resetChartRegistrations,
} from '@alfakit/core'
import { defineComponent, h } from 'vue'
import { toast } from 'vue-sonner'
import ActionList from '../src/components/actions/ActionList.vue'
import ActionModals from '../src/components/actions/ActionModals.vue'
import { showToast } from '../src/components/notifications/flash-toasts'
import ChartWidget from '../src/components/widgets/ChartWidget.vue'
import StatsOverviewWidget from '../src/components/widgets/StatsOverviewWidget.vue'
import { outlineButtonColorClasses } from '../src/lib/colors'
import { actions, flush, mountWithAlfakit, registry } from './mocks'

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

const button = (label: string) =>
  Array.from(document.body.querySelectorAll('button')).find(
    (node) => node.textContent?.trim() === label,
  )

async function openModal() {
  const wrapper = mountWithAlfakit(() => [
    h(ActionList, {
      actions: [{ type: 'Action', name: 'open', label: 'Open', hasModal: true, hasAction: true }],
      context: { token: 't', component: 'page' },
    }),
    h(ActionModals),
  ])

  button('Open')?.click()
  await flush()
  await flush()

  return wrapper
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
  })

  it('renders a registered component as modal content with its data as props', async () => {
    registry.register(
      'order-summary',
      defineComponent({
        props: { component: { type: Object, required: true } },
        setup: (props) => () =>
          h('p', `Total ${(props.component as { props: { total: number } }).props.total}`),
      }),
    )
    mockModal({
      heading: 'Order',
      content: [
        { type: 'View', key: 'v', component: 'order-summary', props: { total: 42 } } as never,
      ],
    })

    const wrapper = await openModal()

    expect(document.body.textContent).toContain('Total 42')

    wrapper.unmount()
  })

  it('styles the "Create & create another" button from createAnotherAction()', async () => {
    mockModal({
      heading: 'Create',
      createAnotherLabel: 'Save and add another',
      createAnotherColor: 'success',
      createAnotherIcon: 'plus',
    })

    const wrapper = await openModal()
    const another = document.body.querySelector<HTMLElement>('[data-slot="create-another"]')

    expect(another?.textContent).toContain('Save and add another')
    expect(another?.className).toContain(outlineButtonColorClasses.success!.split(' ')[0])
    expect(another?.querySelector('svg')).not.toBeNull()

    wrapper.unmount()
  })

  it('runs chart empty-state actions through the widget context', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined)
    const wrapper = mountWithAlfakit(() =>
      h(ChartWidget, {
        widget: emptyChart({
          heading: 'No orders',
          actions: [{ type: 'Action', name: 'import', label: 'Import', hasAction: true }],
        }),
      }),
    )

    button('Import')?.click()
    await flush()

    expect(trigger).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'import' }),
      expect.objectContaining({ component: 'widget:orders' }),
    )

    wrapper.unmount()
  })

  it('renders a custom empty-state view with its data', () => {
    registry.register(
      'orders-empty',
      defineComponent({
        props: { cta: { type: String, required: true } },
        setup: (props) => () => h('p', props.cta),
      }),
    )

    const wrapper = mountWithAlfakit(() =>
      h(ChartWidget, {
        widget: emptyChart({ view: 'orders-empty', viewData: { cta: 'Import now' } }),
      }),
    )

    expect(document.body.textContent).toContain('Import now')
    expect(document.body.textContent).not.toContain('No data to show')

    wrapper.unmount()
  })

  it('resolves js: formatters and registers chart plugins', async () => {
    const money = (value: number) => `$${value}`
    const plugin = { id: 'datalabels' }

    registerChartFormatters({ money })
    registerChartPlugins([plugin])

    const wrapper = mountWithAlfakit(() =>
      h(ChartWidget, {
        widget: {
          ...emptyChart(undefined),
          empty: undefined,
          data: { labels: ['a'], datasets: [{ data: [1] }] },
          options: { scales: { y: { ticks: { callback: 'js:money' } } } },
        } as ChartWidgetSchema,
      }),
    )
    await flush()

    const scales = created[0]!.options.scales as Record<string, { ticks: Record<string, unknown> }>

    expect(scales.y!.ticks.callback).toBe(money)
    expect(registered).toContain(plugin)
    expect(document.body.querySelector('[data-slot="chart-canvas"]')).not.toBeNull()

    wrapper.unmount()
  })

  it('marks stat sparklines with theme hooks', () => {
    const wrapper = mountWithAlfakit(() =>
      h(StatsOverviewWidget, {
        widget: {
          type: 'StatsOverviewWidget',
          key: 'stats',
          id: 'stats',
          columnSpan: { default: 1 },
          stats: [{ label: 'Orders', value: '3', chart: [1, 3, 2] }],
        } as StatsOverviewWidgetSchema,
      }),
    )

    expect(document.body.querySelector('[data-slot="stat-chart"]')).not.toBeNull()
    expect(document.body.querySelector('[data-slot="stat-chart-line"]')).not.toBeNull()

    wrapper.unmount()
  })

  it('closes a toast with closeNotification(id)', () => {
    const dismiss = vi.spyOn(toast, 'dismiss')

    showToast({ id: 'greeting', title: 'Hello', duration: 'persistent' } as never)
    closeNotification('greeting')

    expect(dismiss).toHaveBeenCalledWith('greeting')
  })
})
