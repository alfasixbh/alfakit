import type { ChartWidgetSchema } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/svelte'
import ChartHarness from './ChartHarness.svelte'
import Wrapper from './Wrapper.svelte'

type Data = { datasets: Array<{ data: unknown[] }> }

const created: Array<{ data: Data }> = []
const updates: Data[] = []

// Like Chart.js' `listenArrayEvents`, which Svelte `$state` proxies reject.
function instrument(data: Data) {
  for (const dataset of data.datasets) {
    Object.defineProperty(dataset.data, '_chartjs', {
      configurable: true,
      enumerable: false,
      value: { listeners: [] },
    })
  }
}

vi.mock('chart.js', () => {
  class Chart {
    static register() {}

    data: Data
    options: unknown

    constructor(_element: unknown, config: { data: Data; options: unknown }) {
      instrument(config.data)
      this.data = config.data
      this.options = config.options
      created.push(config)
    }

    update() {
      instrument(this.data)
      updates.push(this.data)
    }

    destroy() {}
  }

  return { Chart, registerables: [] }
})

const widget: ChartWidgetSchema = {
  type: 'Chart',
  key: 'sales',
  id: 'sales',
  chartType: 'line',
  heading: 'Sales',
  data: { labels: ['Jan', 'Feb'], datasets: [{ label: 'Orders', data: [1, 2] }] },
} as unknown as ChartWidgetSchema

describe('ChartWidget', () => {
  beforeEach(() => {
    created.length = 0
    updates.length = 0
  })

  it('mounts with reactive data and updates the chart in place when the data changes', async () => {
    render(Wrapper, {
      props: {
        component: ChartHarness,
        props: {
          initial: widget,
          next: { labels: ['Jan', 'Feb', 'Mar'], datasets: [{ label: 'Orders', data: [1, 2, 3] }] },
        },
      },
    })

    expect(created).toHaveLength(1)
    expect(created[0]?.data.datasets[0]?.data).toEqual([1, 2])

    await fireEvent.click(screen.getByText('poll'))

    // Polling updates the existing chart instead of re-creating it.
    expect(created).toHaveLength(1)
    expect(updates.at(-1)?.datasets[0]?.data).toEqual([1, 2, 3])
  })
})
