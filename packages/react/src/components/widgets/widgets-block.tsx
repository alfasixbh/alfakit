import type { WidgetSchema, WidgetsBlock as WidgetsBlockSchema } from '@alfakit/core'
import {
  columnSpanClasses,
  gridColumnsClasses,
  isLazyPlaceholder,
  resolveFirst,
  widgetRegistryKeys,
} from '@alfakit/core'
import { createElement, type ComponentProps } from 'react'
import { useRegistry, useT } from '../../context'
import { lazyComponent } from '../../lib/lazy'
import { cn } from '../../lib/utils'
import { LazyWidgetPlaceholder } from '../panel/lazy-placeholder'
import { Slot } from '../panel/slot'
import { DataTable } from '../table/table-block'
import { ChartWidget } from './chart-lazy'
import type { CustomizableWidgetGrid as CustomizableWidgetGridComponent } from './dashboard-customizer'
import { StatsOverviewWidget } from './stats-overview'

/**
 * `Dashboard::customizable()`: the grid with its "Edit dashboard" mode. The editor's code
 * loads with the first customizable dashboard; until then (and on the server) the widgets
 * show in the plain grid.
 */
const CustomizableWidgetGrid = lazyComponent<
  ComponentProps<typeof CustomizableWidgetGridComponent>
>(
  () => import('./dashboard-customizer').then((module) => module.CustomizableWidgetGrid),
  ({ block }) => <StaticWidgetGrid block={block} />,
)

export function WidgetGrid({ block }: { block: WidgetsBlockSchema }) {
  if (block.customize) {
    return (
      <CustomizableWidgetGrid
        block={block}
        customize={block.customize}
        renderWidget={(widget) => <WidgetRenderer widget={widget} />}
      />
    )
  }

  return <StaticWidgetGrid block={block} />
}

function StaticWidgetGrid({ block }: { block: WidgetsBlockSchema }) {
  return (
    <div data-slot="widgets" className={cn('grid gap-6', gridColumnsClasses(block.columns))}>
      {block.widgets.map((widget) => (
        <div key={widget.key} className={cn('min-w-0', columnSpanClasses(widget.columnSpan))}>
          {isLazyPlaceholder(widget) ? (
            <LazyWidgetPlaceholder widget={widget} />
          ) : (
            <WidgetRenderer widget={widget} />
          )}
        </div>
      ))}
    </div>
  )
}

export function WidgetRenderer({ widget }: { widget: WidgetSchema }) {
  const registry = useRegistry()
  const t = useT()
  // Registered components win over the built-in renderers: `Widget::$component`,
  // then `widget:<type>` (e.g. `widget:Chart`), then a custom widget's own type.
  const Custom = resolveFirst(registry, widgetRegistryKeys(widget))

  if (Custom) {
    return createElement(Custom, {
      ...(widget.type === 'View' ? (widget.props ?? {}) : {}),
      widget,
    })
  }

  switch (widget.type) {
    case 'StatsOverviewWidget':
      return <StatsOverviewWidget widget={widget} />
    case 'Chart':
      return <ChartWidget widget={widget} />
    case 'TableWidget':
      return (
        <>
          <Slot name="table-widget.start" scope={widget.component} />
          <DataTable table={widget.table} component={widget.component} />
          <Slot name="table-widget.end" scope={widget.component} />
        </>
      )
    case 'View':
      return (
        <div className="text-destructive rounded-md border border-dashed p-3 text-xs">
          {t(
            'widget_not_registered',
            { component: widget.component },
            'Widget component :component is not registered.',
          )}
        </div>
      )
    default:
      return null
  }
}
