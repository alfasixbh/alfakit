import type { AnyActionSchema } from './actions'
import type { AnalyticsBreakdownWidgetSchema } from './analytics'
import type { CalendarWidgetSchema } from './calendar'
import type { Breakpoints, Color, ColumnSpanValue, IconName, IconPosition } from './common'
import type { FormPayload } from './form'
import type { KanbanWidgetSchema } from './kanban'
import type { LiveUpdatesSchema } from './realtime'
import type { TableSchema, TableTriggerActionSchema } from './table'
import type { TreeWidgetSchema } from './tree'

export interface BaseWidgetSchema {
  type: string
  key: string
  id: string
  columnSpan: Breakpoints<ColumnSpanValue>
  /**
   * `Widget::$component`: a registered frontend component that renders this widget in
   * place of the built-in one (it receives `{ widget }`).
   */
  component?: string
  /** `Widget::live()`: refresh when records of the followed models change. */
  live?: LiveUpdatesSchema
}

export interface StatSchema {
  label: string
  value: string | number | null
  /** `placeholder()`: shown instead of a null or empty value. */
  placeholder?: string
  description?: string
  descriptionIcon?: IconName
  /** `descriptionIcon($icon, IconPosition::After)`: the icon follows the description. */
  descriptionIconPosition?: IconPosition
  descriptionColor?: Color
  color?: Color
  icon?: IconName
  chart?: number[]
  chartColor?: Color
  url?: string
  openUrlInNewTab?: boolean
  extraAttributes?: Record<string, unknown>
}

export interface StatsOverviewWidgetSchema extends BaseWidgetSchema {
  type: 'StatsOverviewWidget'
  heading?: string
  description?: string
  pollingInterval?: string
  columns?: Breakpoints
  stats: StatSchema[]
}

export interface ChartWidgetSchema extends BaseWidgetSchema {
  type: 'Chart'
  chartType:
    | 'line'
    | 'bar'
    | 'pie'
    | 'doughnut'
    | 'radar'
    | 'polarArea'
    | 'bubble'
    | 'scatter'
    | (string & {})
  heading?: string
  description?: string
  /**
   * `getChartAssistiveContent()`: an accessible alternative to the canvas (HTML), rendered
   * visually hidden and linked with `aria-describedby`.
   */
  assistiveContent?: string
  /** Chart.js `data` object. */
  data: Record<string, unknown>
  options?: Record<string, unknown>
  filters?: Array<{ value: string; label: string }>
  filter?: string | null
  pollingInterval?: string
  maxHeight?: string
  /** `$color`: theme colour of datasets that set no colours of their own. */
  color?: Color
  /** `$isCollapsible`: the user can collapse the chart to its header. */
  collapsible?: boolean
  /** `filtersSchema()` (`HasFiltersSchema`): a form of filters kept in the query string. */
  filtersForm?: ChartFiltersFormSchema
  /** `getData()` returned nothing (`isEmpty()`): show the empty state instead of the chart. */
  empty?: boolean
  emptyState?: ChartEmptyStateSchema
}

/** The empty state of a chart widget (`$emptyStateHeading`, `getEmptyStateActions()`…). */
export interface ChartEmptyStateSchema {
  heading?: string
  description?: string
  icon?: IconName
  /** `getEmptyStateActions()`: they run through the widget (`widget:<id>`). */
  actions?: AnyActionSchema[]
  /** `$emptyStateView`: a registered component rendered in place of the default empty state. */
  view?: string
  /** `getEmptyStateViewData()`: props of the `view` component. */
  viewData?: Record<string, unknown>
}

/** The filters form of a chart widget. */
export interface ChartFiltersFormSchema extends FormPayload {
  /** `$hasDeferredFilters`: changes apply when the user clicks "Apply". */
  deferred?: boolean
  /** Query-string key the values live under: `{queryKey}[{widget id}][{field}]`. */
  queryKey: string
  /** `filtersApplyAction()` / `filtersResetAction()`: the restyled Apply / Reset buttons. */
  triggerActions?: Partial<Record<'filtersApply' | 'filtersReset', TableTriggerActionSchema>>
}

export interface TableWidgetSchema extends BaseWidgetSchema {
  type: 'TableWidget'
  component: string
  table: TableSchema
}

export interface CustomWidgetSchema extends BaseWidgetSchema {
  type: 'View'
  component: string
  props?: Record<string, unknown>
}

export type WidgetSchema =
  | StatsOverviewWidgetSchema
  | ChartWidgetSchema
  | TableWidgetSchema
  | CustomWidgetSchema
  // First-party plugin widgets (alfasix/alfakit-calendar, alfasix/alfakit-tree,
  // alfasix/alfakit-kanban).
  | CalendarWidgetSchema
  | TreeWidgetSchema
  | KanbanWidgetSchema
  // alfasix/alfakit-analytics
  | AnalyticsBreakdownWidgetSchema

/**
 * A lazy widget's stand-in on a full page response (`Widget::toLazySchema()`): render a
 * skeleton in its cell until the `alfakitLazy` deferred prop brings its schema.
 */
export interface LazyWidgetSchema extends BaseWidgetSchema {
  lazy: true
  /**
   * Set in the browser, never by PHP: loading the widget's schema failed (a refused or
   * failed request), so the renderer shows an error with a retry instead of a skeleton.
   */
  failed?: true
}

export interface WidgetsBlock {
  type: 'Widgets'
  key: string
  columns: Breakpoints
  widgets: Array<WidgetSchema | LazyWidgetSchema>
  /** `Dashboard::customizable()`: what the "Edit dashboard" mode needs. */
  customize?: DashboardCustomizeSchema
}

/** One widget's place in a dashboard layout. */
export interface DashboardLayoutEntry {
  id: string
  /** Column count the user chose; null keeps the widget's own span. */
  span: number | null
  hidden: boolean
}

/** A span the user may pick for a widget. */
export interface DashboardSpanOption {
  value: number
  label: string
  /** The responsive `columnSpan` the span stands for (for the edit-mode preview). */
  columnSpan: Breakpoints<ColumnSpanValue>
}

/** A widget of the dashboard's library (every widget the user may place). */
export interface DashboardLibraryWidget {
  id: string
  label: string
  description?: string
  /** Part of the developer's default layout. */
  default: boolean
  /** The widget's own span. */
  span: number
  spans: DashboardSpanOption[]
}

export interface DashboardCustomizeSchema {
  /** POST `{token, layout}` or `{token, reset: true}`. */
  endpoint?: string
  token: string
  /** The user saved a layout of their own. */
  customized: boolean
  layout: DashboardLayoutEntry[]
  defaultLayout: DashboardLayoutEntry[]
  library: DashboardLibraryWidget[]
}
