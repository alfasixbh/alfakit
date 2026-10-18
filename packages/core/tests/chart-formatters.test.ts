import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildChartConfig,
  configureCharts,
  getChartPlugins,
  registerChartFormatters,
  resetChartRegistrations,
  resolveChartCallbacks,
} from '../src/chart'

const resolveColor = (name: string) => `#${name.replace(/[^0-9a-z]/g, '')}`

afterEach(() => {
  resetChartRegistrations()
  vi.restoreAllMocks()
})

describe('chart formatters', () => {
  it("replaces 'js:name' strings with the registered formatter", () => {
    const money = (value: number) => `$${value}`

    registerChartFormatters({ money })

    const config = buildChartConfig({
      type: 'bar',
      data: { datasets: [{ data: [1] }] },
      options: { scales: { y: { ticks: { callback: 'js:money' } } } },
      rtl: false,
      locale: 'en',
      resolveColor,
    })
    const scales = config.options.scales as Record<string, { ticks: Record<string, unknown> }>

    expect(scales.y!.ticks.callback).toBe(money)
    // The theme defaults are kept next to the callback.
    expect(scales.y!.ticks.color).toBe('#charttext')
  })

  it('takes formatters passed to buildChartConfig over the registered ones', () => {
    const label = () => 'label'

    const config = buildChartConfig({
      type: 'line',
      data: { datasets: [] },
      options: { plugins: { tooltip: { callbacks: { label: 'js:tooltip.label' } } } },
      rtl: false,
      locale: 'en',
      resolveColor,
      formatters: { 'tooltip.label': label },
    })
    const tooltip = (config.options.plugins as Record<string, Record<string, unknown>>).tooltip!

    expect((tooltip.callbacks as Record<string, unknown>).label).toBe(label)
  })

  it('leaves unknown formatters out and warns once per name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const options = resolveChartCallbacks({
      a: { callback: 'js:missing', keep: 'text' },
      b: ['js:missing', 1],
    })

    expect(options).toEqual({ a: { keep: 'text' }, b: [1] })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('missing')
  })

  it('never evaluates strings that only look like code', () => {
    const options = resolveChartCallbacks(
      { a: 'js:alert(1)', b: 'js:', c: 'javascript:void(0)', d: 'js:constructor' },
      {},
    )

    expect(options).toEqual({ a: 'js:alert(1)', b: 'js:', c: 'javascript:void(0)' })
  })

  it('registers chart plugins once through createAlfakit options', () => {
    const plugin = { id: 'datalabels' }

    configureCharts({ chartPlugins: [plugin, plugin], chartFormatters: {} })
    configureCharts({ chartPlugins: [plugin] })

    expect(getChartPlugins()).toEqual([plugin])
  })
})

describe('chart theme hooks', () => {
  it('styles tooltips and legends from the chart custom properties', () => {
    const values: Record<string, string> = {
      '--chart-tooltip-bg': 'white',
      '--chart-tooltip-foreground': 'black',
      '--chart-tooltip-border': 'gray',
      '--chart-tooltip-border-width': '2',
      '--chart-tooltip-radius': 'not-a-number',
      '--chart-legend-foreground': 'navy',
    }

    const config = buildChartConfig({
      type: 'pie',
      data: { datasets: [] },
      rtl: false,
      locale: 'en',
      resolveColor: (name) => values[name] ?? `var(${name})`,
    })
    const plugins = config.options.plugins as Record<string, Record<string, unknown>>

    expect(plugins.tooltip).toMatchObject({
      backgroundColor: 'white',
      titleColor: 'black',
      bodyColor: 'black',
      borderColor: 'gray',
      borderWidth: 2,
    })
    expect(plugins.tooltip).not.toHaveProperty('cornerRadius')
    expect(plugins.legend!.labels).toEqual({ color: 'navy' })
  })

  it('falls back to the base tokens when a theme leaves the properties out', () => {
    const config = buildChartConfig({
      type: 'bar',
      data: { datasets: [] },
      rtl: false,
      locale: 'en',
      resolveColor: (name) => (name.startsWith('--chart-') ? `var(${name})` : `[${name}]`),
    })
    const plugins = config.options.plugins as Record<string, Record<string, unknown>>
    const scales = config.options.scales as Record<string, Record<string, Record<string, unknown>>>

    expect(plugins.tooltip).not.toHaveProperty('backgroundColor')
    expect(plugins.legend!.labels).toEqual({ color: '[--muted-foreground]' })
    expect(scales.x!.grid!.color).toBe('[--border]')
  })
})
