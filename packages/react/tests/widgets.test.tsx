import type { ChartWidgetSchema, WidgetSchema } from '@alfakit/core'
import { render, screen } from '@testing-library/react'
import { TableCellContent } from '../src/components/table/cells'
import { WidgetRenderer } from '../src/components/widgets/widgets-block'
import { Wrapper, registry } from './mocks'

type Data = { datasets: Array<{ data: unknown[] }> }

const created: Array<{ data: Data }> = []
const updates: Data[] = []

vi.mock('chart.js', () => {
  class Chart {
    static register() {}

    data: Data
    options: unknown

    constructor(_element: unknown, config: { data: Data; options: unknown }) {
      this.data = config.data
      this.options = config.options
      created.push(config)
    }

    update() {
      updates.push(this.data)
    }

    destroy() {}
  }

  return { Chart, registerables: [] }
})

const chart = (data: unknown[]): ChartWidgetSchema =>
  ({
    type: 'Chart',
    key: 'sales',
    id: 'sales',
    columnSpan: { default: 1 },
    chartType: 'line',
    data: { labels: ['a', 'b', 'c'], datasets: [{ data }] },
    options: { plugins: { legend: { display: false } } },
  }) as ChartWidgetSchema

describe('widgets', () => {
  beforeEach(() => {
    created.length = 0
    updates.length = 0
  })

  it('updates the chart in place on new data and deep-merges options', async () => {
    const { rerender } = render(
      <Wrapper>
        <WidgetRenderer widget={chart([1, 2])} />
      </Wrapper>,
    )

    // Chart.js loads with the chart's own chunk, the first time a chart is shown.
    await screen.findByRole('img')

    rerender(
      <Wrapper>
        <WidgetRenderer widget={chart([1, 2, 3])} />
      </Wrapper>,
    )

    expect(created).toHaveLength(1)
    expect(updates.at(-1)?.datasets[0]?.data).toEqual([1, 2, 3])
    const options = (created[0] as unknown as { options: { plugins: Record<string, unknown> } })
      .options
    expect(options.plugins.legend).toMatchObject({ display: false, rtl: false })
    expect(options.plugins.tooltip).toBeDefined()
  })

  it('renders registered widget and column components instead of the built-ins', () => {
    registry.register('widget:Chart', ({ widget }: { widget: WidgetSchema }) => (
      <p>custom {widget.id}</p>
    ))
    registry.register('sales-map', () => <p>map widget</p>)

    render(
      <Wrapper>
        <WidgetRenderer widget={chart([1])} />
        <WidgetRenderer widget={{ ...chart([1]), id: 'map', key: 'map', component: 'sales-map' }} />
      </Wrapper>,
    )

    expect(screen.getByText('custom sales')).toBeTruthy()
    expect(screen.getByText('map widget')).toBeTruthy()
    expect(created).toHaveLength(0)
  })

  it('renders a column registered as column:<type>', () => {
    registry.register('column:progress', ({ cell }: { cell: { state: unknown } }) => (
      <span>progress {String(cell.state)}</span>
    ))

    render(
      <Wrapper>
        <TableCellContent
          column={{ type: 'progress', name: 'done', label: 'Done' } as never}
          cell={{ state: 40 } as never}
          recordKey={1}
          token="t"
          component="table"
        />
      </Wrapper>,
    )

    expect(screen.getByText('progress 40')).toBeTruthy()
  })
})
