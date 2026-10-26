import { describe, expect, it, vi } from 'vitest'
import { buildChartConfig, mergeChartOptions, observeThemeChanges, withAlpha } from '../src/chart'

const resolveColor = (name: string) => `#${name.replace(/[^0-9a-z]/g, '')}`

describe('buildChartConfig', () => {
  it('deep-merges custom plugins and scales options into the defaults', () => {
    const config = buildChartConfig({
      type: 'bar',
      data: { labels: ['a'], datasets: [{ data: [1] }] },
      options: {
        plugins: { legend: { display: false }, title: { display: true, text: 'Orders' } },
        scales: { y: { beginAtZero: true } },
      },
      rtl: true,
      locale: 'ar',
      resolveColor,
    })

    const plugins = config.options.plugins as Record<string, Record<string, unknown>>
    const scales = config.options.scales as Record<string, Record<string, unknown>>

    expect(plugins.legend).toMatchObject({ display: false, rtl: true, textDirection: 'rtl' })
    expect(plugins.legend!.labels).toEqual({ color: '#chartlegendforeground' })
    expect(plugins.title).toEqual({ display: true, text: 'Orders' })
    expect(plugins.tooltip).toMatchObject({ rtl: true })
    expect(scales.y).toMatchObject({ beginAtZero: true, position: 'right' })
    expect(scales.x).toMatchObject({ reverse: true })
    expect(config.options.locale).toBe('ar')
  })

  it('themes datasets without overriding their own colours', () => {
    const config = buildChartConfig({
      type: 'pie',
      data: { datasets: [{ data: [1, 2] }, { data: [3], borderColor: 'red' }] },
      rtl: false,
      locale: 'en',
      resolveColor,
    })
    const datasets = config.data.datasets as Array<Record<string, unknown>>

    expect(datasets[0]!.backgroundColor).toEqual(['#chart1', '#chart2'])
    expect(datasets[1]!.borderColor).toBe('red')
    expect(config.options.scales).toBeUndefined()
  })

  it('replaces arrays and scalars instead of merging them', () => {
    expect(mergeChartOptions({ a: [1, 2], b: { c: 1 } }, { a: [3], b: null })).toEqual({
      a: [3],
      b: null,
    })
  })
})

describe('withAlpha', () => {
  it('applies an alpha in the colour syntax the theme used', () => {
    expect(withAlpha('#073B78', 0.2)).toBe('#073B7833')
    expect(withAlpha('#fff', 0.5)).toBe('#ffffff80')
    expect(withAlpha('oklch(0.359 0.116 256.3)', 0.2)).toBe('oklch(0.359 0.116 256.3 / 0.2)')
    expect(withAlpha('oklch(0.359 0.116 256.3 / 0.9)', 0.2)).toBe('oklch(0.359 0.116 256.3 / 0.2)')
    expect(withAlpha('rgb(7 59 120)', 0.2)).toBe('rgb(7 59 120 / 0.2)')
    expect(withAlpha('rgba(7, 59, 120, 1)', 0.2)).toBe('rgba(7, 59, 120, 0.2)')
    expect(withAlpha('hsl(210, 90%, 25%)', 0.2)).toBe('hsl(210, 90%, 25%, 0.2)')
    expect(withAlpha('var(--chart-1)', 0.2)).toBe(
      'color-mix(in srgb, var(--chart-1) 20%, transparent)',
    )
  })

  it('fills line datasets with a translucent oklch colour instead of an invalid hex string', () => {
    const config = buildChartConfig({
      type: 'line',
      data: { datasets: [{ data: [1, 2] }] },
      rtl: false,
      locale: 'en',
      resolveColor: () => 'oklch(0.709 0.175 50.2)',
    })
    const datasets = config.data.datasets as Array<Record<string, unknown>>

    expect(datasets[0]!.backgroundColor).toBe('oklch(0.709 0.175 50.2 / 0.2)')
  })
})

describe('observeThemeChanges', () => {
  it('notifies when <html> attributes change', async () => {
    const callback = vi.fn()
    const stop = observeThemeChanges(callback)

    document.documentElement.classList.toggle('dark')
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(callback).toHaveBeenCalled()
    stop()
  })
})

describe('chart registrations', () => {
  it('are shared by two copies of the module, as under the Vite dev server (W-S3-09)', async () => {
    vi.resetModules()
    const first = await import('../src/chart')
    vi.resetModules()
    const second = await import('../src/chart')
    expect(first.registerChartFormatters).not.toBe(second.registerChartFormatters)

    const money = (value: unknown) => `$${String(value)}`
    const plugin = { id: 'labels' }
    first.registerChartFormatters({ money })
    first.registerChartPlugins([plugin])

    try {
      expect(second.getChartFormatters().money).toBe(money)
      expect(second.getChartPlugins()).toContain(plugin)
    } finally {
      second.resetChartRegistrations()
    }

    expect(first.getChartFormatters()).toEqual({})
    expect(first.getChartPlugins()).toEqual([])
  })
})
