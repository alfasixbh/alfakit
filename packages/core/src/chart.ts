/**
 * Framework-agnostic Chart.js configuration shared by every renderer's chart widget.
 * Nothing here imports Chart.js: renderers pass the result to their own `Chart` instance.
 */

const PALETTE = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5']

const CIRCULAR = ['pie', 'doughnut', 'polarArea']

const WITHOUT_CARTESIAN_SCALES = ['pie', 'doughnut', 'polarArea', 'radar']

export interface ChartConfigInput {
  type: string
  data: Record<string, unknown>
  options?: Record<string, unknown> | null
  rtl: boolean
  locale: string
  /** Resolve a CSS custom property name (`--chart-1`) to a colour Chart.js can paint. */
  resolveColor?: (name: string) => string
  /**
   * `ChartWidget::$color`: the theme colour of datasets without colours of their own
   * (pie-like charts keep one palette colour per slice).
   */
  color?: string | null
  /**
   * Named callbacks that `'js:name'` strings in `options` resolve to. Defaults to the ones
   * registered with `createAlfakit({ chartFormatters })` / `registerChartFormatters()`.
   */
  formatters?: Record<string, ChartFormatter>
}

/** The CSS custom property of a theme colour name (`danger` → `--destructive`). */
export function chartColorVariable(color: string): string {
  switch (color) {
    case 'danger':
      return '--destructive'
    case 'gray':
      return '--muted-foreground'
    default:
      return `--${color}`
  }
}

export interface ChartConfigOutput {
  type: string
  data: Record<string, unknown>
  options: Record<string, unknown>
}

/** Reads a CSS custom property from `<html>`, so the current theme and dark mode apply. */
export function resolveCssColor(name: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return `var(${name})`
  }

  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || `var(${name})`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value) as unknown

  return prototype === Object.prototype || prototype === null
}

/**
 * Deep-merges Chart.js options: nested plain objects (`plugins.legend`, `scales.y.ticks`)
 * are merged key by key; arrays, functions and scalars from `override` replace the base.
 */
export function mergeChartOptions(
  base: Record<string, unknown>,
  override: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base }

  for (const [key, value] of Object.entries(override ?? {})) {
    const current = result[key]

    result[key] =
      isPlainObject(current) && isPlainObject(value) ? mergeChartOptions(current, value) : value
  }

  return result
}

/**
 * A translucent version of a resolved theme colour for line fills. Themes declare chart
 * colours in any CSS syntax (`#rrggbb`, `rgb()`, `hsl()`, `oklch()`, `var()`), so the alpha
 * is applied in that syntax rather than by appending hex digits, which would hand Chart.js
 * an invalid colour (painted black).
 */
export function withAlpha(color: string, alpha: number): string {
  const value = color.trim()
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value)

  if (hex) {
    const digits = hex[1]!
    const rgb =
      digits.length <= 4
        ? digits
            .slice(0, 3)
            .split('')
            .map((d) => d + d)
            .join('')
        : digits.slice(0, 6)
    const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
      .toString(16)
      .padStart(2, '0')

    return `#${rgb}${a}`
  }

  const fn = /^([a-z-]+)\((.*)\)$/i.exec(value)

  if (fn) {
    const name = fn[1]!
    const args = fn[2]!

    if (name.toLowerCase() === 'var') {
      return `color-mix(in srgb, ${value} ${Math.round(alpha * 100)}%, transparent)`
    }

    // Legacy comma syntax: rgb(a)/hsl(a) with commas takes the alpha as a fourth argument.
    if (args.includes(',')) {
      const parts = args.split(',').map((part) => part.trim())

      return `${name}(${parts.slice(0, 3).join(', ')}, ${alpha})`
    }

    // Modern space syntax: drop an existing `/ alpha` and append ours.
    const channels = args.replace(/\s*\/.*$/, '').trim()

    return `${name}(${channels} / ${alpha})`
  }

  return value
}

/** Apply theme colours to datasets that don't specify their own. */
function themeDatasets(
  data: Record<string, unknown>,
  type: string,
  resolve: (name: string) => string,
  fixed?: string | null,
): Record<string, unknown> {
  const datasets = Array.isArray(data.datasets)
    ? (data.datasets as Array<Record<string, unknown>>)
    : []
  const circular = CIRCULAR.includes(type)
  const palette = (index: number) => resolve(PALETTE[index % PALETTE.length] ?? '--chart-1')
  const color = (index: number) =>
    fixed && !circular ? resolve(chartColorVariable(fixed)) : palette(index)

  return {
    ...data,
    datasets: datasets.map((dataset, index) => {
      const base = color(index)
      const values = Array.isArray(dataset.data) ? (dataset.data as unknown[]) : []
      const many = circular ? values.map((_, i) => palette(i)) : undefined

      return {
        borderColor: many ?? base,
        backgroundColor: many ?? (type === 'line' ? withAlpha(base, 0.2) : base),
        borderWidth: type === 'line' ? 2 : 1,
        tension: 0.3,
        fill: type === 'line',
        pointRadius: 2,
        ...dataset,
      }
    }),
  }
}

/**
 * Builds the Chart.js `type`, `data` and `options` for a chart widget: theme colours,
 * reading direction and locale defaults, deep-merged with the widget's own `options`.
 */
export function buildChartConfig(input: ChartConfigInput): ChartConfigOutput {
  const resolve = input.resolveColor ?? resolveCssColor
  // Chart.js paints legends, tooltips and axes on the canvas, so themes style them through
  // these custom properties (defaults in `themes.css`); without them the base tokens apply.
  const themed = (name: string, fallback: string): string => {
    const value = resolve(name).trim()

    return value === '' || value.startsWith('var(') ? fallback : value
  }
  const textColor = themed('--chart-text', resolve('--muted-foreground'))
  const gridColor = themed('--chart-grid', resolve('--border'))
  const textDirection = input.rtl ? 'rtl' : 'ltr'
  const tooltip: Record<string, unknown> = { rtl: input.rtl, textDirection }

  for (const [option, name] of [
    ['backgroundColor', '--chart-tooltip-bg'],
    ['titleColor', '--chart-tooltip-foreground'],
    ['bodyColor', '--chart-tooltip-foreground'],
    ['footerColor', '--chart-tooltip-foreground'],
    ['borderColor', '--chart-tooltip-border'],
  ] as const) {
    const value = themed(name, '')

    if (value !== '') tooltip[option] = value
  }

  for (const [option, name] of [
    ['borderWidth', '--chart-tooltip-border-width'],
    ['cornerRadius', '--chart-tooltip-radius'],
  ] as const) {
    const value = chartNumber(themed(name, ''))

    if (value !== undefined) tooltip[option] = value
  }

  const defaults: Record<string, unknown> = {
    responsive: true,
    maintainAspectRatio: false,
    locale: input.locale,
    plugins: {
      legend: {
        rtl: input.rtl,
        textDirection,
        labels: { color: themed('--chart-legend-foreground', textColor) },
      },
      tooltip,
    },
  }

  if (!WITHOUT_CARTESIAN_SCALES.includes(input.type)) {
    defaults.scales = {
      x: { reverse: input.rtl, ticks: { color: textColor }, grid: { color: gridColor } },
      y: {
        position: input.rtl ? 'right' : 'left',
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
    }
  }

  return {
    type: input.type,
    data: themeDatasets(input.data, input.type, resolve, input.color),
    options: mergeChartOptions(
      defaults,
      resolveChartCallbacks(input.options ?? {}, input.formatters ?? registry.formatters) as Record<
        string,
        unknown
      >,
    ),
  }
}

/** A unitless number from a CSS custom property (`6`, `1.5`), or undefined. */
function chartNumber(value: string): number | undefined {
  if (value === '') return undefined

  const number = Number(value)

  return Number.isFinite(number) ? number : undefined
}

// ---------------------------------------------------------------- Formatters & plugins

/**
 * A callback Chart.js calls (tick `callback`, tooltip `label`…), registered by name. Any
 * function signature fits: `(value: number) => string`, `(context: TooltipItem) => string`.
 */
export type ChartFormatter = (...args: never[]) => unknown

/** `'js:name'`: a reference to a registered chart formatter, never code. */
const FORMATTER_REFERENCE = /^js:([A-Za-z_$][\w$-]*(?:\.[A-Za-z_$][\w$-]*)*)$/

interface ChartRegistry {
  formatters: Record<string, ChartFormatter>
  plugins: unknown[]
  warned: Set<string>
}

/**
 * The registrations live on `globalThis`, so two copies of `@alfakit/core` share them: under
 * `npm run dev` Vite serves `@alfakit/core` pre-bundled on its own while the renderer package
 * carries another copy, and formatters registered through one must reach charts drawn by the
 * other (W-S3-09).
 */
const registry: ChartRegistry = ((
  globalThis as { __alfakitCharts?: ChartRegistry }
).__alfakitCharts ??= {
  formatters: {},
  plugins: [],
  warned: new Set<string>(),
})

/**
 * Register named callbacks for chart options: `ChartWidget::getOptions()` refers to them
 * as `'js:name'` strings (`['scales' => ['y' => ['ticks' => ['callback' => 'js:money']]]]`).
 * Strings are only ever looked up here, never evaluated.
 */
export function registerChartFormatters(formatters: Record<string, ChartFormatter>): void {
  registry.formatters = { ...registry.formatters, ...formatters }
}

export function getChartFormatters(): Readonly<Record<string, ChartFormatter>> {
  return registry.formatters
}

/**
 * Chart.js plugins for every chart (`chartjs-plugin-datalabels`…): each renderer passes
 * them to `Chart.register()` before it draws a chart.
 */
export function registerChartPlugins(plugins: readonly unknown[]): void {
  for (const plugin of plugins) {
    if (plugin && !registry.plugins.includes(plugin)) registry.plugins.push(plugin)
  }
}

export function getChartPlugins(): readonly unknown[] {
  return registry.plugins
}

/** `createAlfakit({ chartFormatters, chartPlugins })`. */
export function configureCharts(options: {
  chartFormatters?: Record<string, ChartFormatter>
  chartPlugins?: readonly unknown[]
}): void {
  if (options.chartFormatters) registerChartFormatters(options.chartFormatters)
  if (options.chartPlugins) registerChartPlugins(options.chartPlugins)
}

/** Forget registered formatters and plugins (tests). */
export function resetChartRegistrations(): void {
  registry.formatters = {}
  registry.plugins.length = 0
  registry.warned.clear()
}

const MISSING = Symbol('missing')

/**
 * Replace `'js:name'` strings anywhere in chart options with the registered formatter of
 * that name. An unknown name is left out (Chart.js then uses its default) with a console
 * warning, once per name; other values are copied unchanged.
 */
export function resolveChartCallbacks(
  value: unknown,
  formatters: Record<string, ChartFormatter> = registry.formatters,
): unknown {
  const resolved = resolveCallback(value, formatters)

  return resolved === MISSING ? undefined : resolved
}

function resolveCallback(value: unknown, formatters: Record<string, ChartFormatter>): unknown {
  if (typeof value === 'string') {
    const match = FORMATTER_REFERENCE.exec(value)

    if (!match) return value

    const name = match[1]!
    const formatter = Object.prototype.hasOwnProperty.call(formatters, name)
      ? formatters[name]
      : undefined

    if (typeof formatter === 'function') return formatter

    if (!registry.warned.has(name)) {
      registry.warned.add(name)
      console.warn(
        `Alfakit: chart formatter "${name}" is not registered; pass it to createAlfakit({ chartFormatters }).`,
      )
    }

    return MISSING
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveCallback(item, formatters)).filter((item) => item !== MISSING)
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {}

    for (const [key, item] of Object.entries(value)) {
      const resolved = resolveCallback(item, formatters)

      if (resolved !== MISSING) result[key] = resolved
    }

    return result
  }

  return value
}

/**
 * Calls `callback` when the theme may have changed: dark mode, theme attributes or inline
 * CSS variables on `<html>`, or the OS colour scheme. Returns an unsubscribe function.
 */
export function observeThemeChanges(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {}
  }

  let frame: number | null = null
  const schedule = () => {
    if (frame !== null) return

    frame = window.requestAnimationFrame(() => {
      frame = null
      callback()
    })
  }

  const observer =
    typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => schedule())

  observer?.observe(document.documentElement, { attributes: true })

  const media =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null

  media?.addEventListener('change', schedule)

  return () => {
    observer?.disconnect()
    media?.removeEventListener('change', schedule)

    if (frame !== null) window.cancelAnimationFrame(frame)
  }
}
