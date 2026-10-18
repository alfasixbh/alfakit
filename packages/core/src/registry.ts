import type { ChartFormatter } from './chart'
import type { DiscoveryModules } from './discovery'
import type { EchoFactory, EchoLike } from './realtime'

/**
 * Maps schema `type` names (and custom `View` component names) to renderer components.
 * Each adapter creates one registry with its built-in components; applications extend
 * or override entries through `createAlfakit({ components })`.
 */
export class ComponentRegistry<TComponent> {
  private readonly components = new Map<string, TComponent>()

  constructor(initial: Record<string, TComponent> = {}) {
    this.registerMany(initial)
  }

  register(type: string, component: TComponent): this {
    this.components.set(type, component)

    return this
  }

  registerMany(components: Record<string, TComponent>): this {
    for (const [type, component] of Object.entries(components)) {
      this.register(type, component)
    }

    return this
  }

  resolve(type: string): TComponent | undefined {
    return this.components.get(type)
  }

  has(type: string): boolean {
    return this.components.has(type)
  }

  types(): string[] {
    return [...this.components.keys()]
  }
}

/** Shared options accepted by every adapter's `createAlfakit()`. */
export interface AlfakitOptions<TComponent> {
  /** Schema component renderers, keyed by type (`TextInput`) or View name (`map-picker`). */
  components?: Record<string, TComponent>
  /** Custom Inertia page components, keyed by the name set in `Page::$component`. */
  pages?: Record<string, TComponent>
  /**
   * Auto-registered components: `import.meta.glob()` over the entry's `fields`, `columns`,
   * `entries`, `widgets`, `pages`, `components` and `blocks` folders. Keys come from the file
   * paths (`fields/ColorWheel.tsx` → `ColorWheel`, see `discoveryKey()`), code loads when a
   * page uses it, and `components` / `pages` win over discovered files.
   */
  discover?: DiscoveryModules
  /** Title template; receives the page title. */
  title?: (title: string, brandName: string) => string
  /** Inertia progress bar configuration (false to disable). */
  progress?: false | { color?: string; delay?: number; includeCSS?: boolean; showSpinner?: boolean }
  /**
   * Named chart callbacks: `ChartWidget::getOptions()` refers to them as `'js:name'`
   * (`'callback' => 'js:money'`). Strings are looked up here, never evaluated.
   */
  chartFormatters?: Record<string, ChartFormatter>
  /** Chart.js plugins registered for every chart (`Chart.register()`). */
  chartPlugins?: readonly unknown[]
  /**
   * Tiptap extensions of rich content plugins, keyed like `getTipTapJsExtensions()`
   * returns them: `{ 'highlight-color': () => import('./highlight-color') }`.
   */
  richEditorExtensions?: Record<string, () => unknown>
  /**
   * Laravel Echo for `Panel::realtime()` when the app has no `window.Echo`: an instance, or
   * a factory receiving the panel's options (`authEndpoint`, `csrfToken`, `config('alfakit.broadcasting.echo')`):
   * `echo: (options) => new Echo({ ...options, broadcaster: 'reverb', Pusher })`.
   */
  echo?: EchoLike | EchoFactory | null
}

/** Built-in widget types; anything else is a custom widget registered by its type. */
export const BUILT_IN_WIDGET_TYPES = [
  'StatsOverviewWidget',
  'Chart',
  'TableWidget',
  'View',
] as const

/**
 * Registry keys tried, in order, before a widget falls back to its built-in renderer:
 * the widget's own `$component` (a `View` widget, or a `ChartWidget`/stats widget with a
 * custom component), then `widget:<type>` (overrides every widget of that type, e.g.
 * `widget:Chart`), then the bare type of a custom widget class.
 */
export function widgetRegistryKeys(widget: { type: string; component?: string | null }): string[] {
  const keys: string[] = []

  // A TableWidget's `component` is its table identifier, not a registry key.
  if (widget.type !== 'TableWidget' && widget.component) {
    keys.push(widget.component)
  }

  keys.push(`widget:${widget.type}`)

  if (!(BUILT_IN_WIDGET_TYPES as readonly string[]).includes(widget.type)) {
    keys.push(widget.type)
  }

  return keys
}

/** Registry key for a table column renderer: `column:<type>` (e.g. `column:TextColumn`). */
export function columnRegistryKey(column: { type: string }): string {
  return `column:${column.type}`
}

/** Resolve the first registered component among `keys`. */
export function resolveFirst<TComponent>(
  registry: Pick<ComponentRegistry<TComponent>, 'resolve'>,
  keys: string[],
): TComponent | undefined {
  for (const key of keys) {
    const component = registry.resolve(key)

    if (component !== undefined) {
      return component
    }
  }

  return undefined
}
