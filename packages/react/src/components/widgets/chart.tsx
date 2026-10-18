import type { ChartWidgetSchema } from '@alfakit/core'
import {
  buildChartConfig,
  getChartPlugins,
  observeThemeChanges,
  resolvePartialProps,
  widgetPollTarget,
} from '@alfakit/core'
import { router } from '@inertiajs/react'
import { Chart, registerables, type ChartConfiguration, type Plugin } from 'chart.js'
import { ChartColumnIcon, ChevronDownIcon } from 'lucide-react'
import { createElement, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useDirection, useLocalization, usePollComponent, useRegistry, useT } from '../../context'
import { cssColor } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import { ActionList } from '../actions/action-list'
import { useLiveUpdates } from '../realtime/live-records-pill'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { ChartFilters } from './chart-filters'

Chart.register(...registerables)

export function ChartWidget({ widget }: { widget: ChartWidgetSchema }) {
  const t = useT()
  const canvas = useRef<HTMLCanvasElement>(null)
  const chart = useRef<Chart | null>(null)
  const chartType = useRef<string | null>(null)
  const rtl = useDirection() === 'rtl'
  const locale = useLocalization()?.tag ?? 'en'
  // Bumped when the theme or dark mode changes so colours are re-read from CSS.
  const [themeVersion, setThemeVersion] = useState(0)

  useEffect(() => observeThemeChanges(() => setThemeVersion((version) => version + 1)), [])

  const config = useMemo(() => {
    void themeVersion

    return buildChartConfig({
      type: widget.chartType,
      data: widget.data,
      options: widget.options,
      rtl,
      locale,
      color: widget.color,
    }) as unknown as ChartConfiguration
  }, [widget.chartType, widget.data, widget.options, widget.color, rtl, locale, themeVersion])
  const [collapsed, setCollapsed] = useState(false)
  const bodyId = useId()
  // The canvas only exists while the chart is shown (not empty, not collapsed).
  const showChart = !widget.empty && !collapsed

  // Polling, theme, direction and locale changes update the chart in place; it is only
  // re-created when its type changes.
  useEffect(() => {
    if (!canvas.current) {
      chart.current?.destroy()
      chart.current = null

      return
    }

    const instance = chart.current

    if (instance && chartType.current === config.type) {
      instance.data = config.data
      instance.options = config.options ?? {}
      instance.update()

      return
    }

    instance?.destroy()
    // `createAlfakit({ chartPlugins })`, registered before the chart is drawn.
    const plugins = getChartPlugins() as Plugin[]

    if (plugins.length > 0) Chart.register(...plugins)

    chart.current = new Chart(canvas.current, config)
    chartType.current = config.type
  }, [config, showChart])

  useEffect(
    () => () => {
      chart.current?.destroy()
      chart.current = null
    },
    [],
  )

  // Polls refresh only this widget, share one request with other components on the same
  // interval and pause while the tab is hidden.
  const pollTarget = widgetPollTarget(widget)
  const pollComponent = usePollComponent()

  useEffect(
    () => pollComponent(pollTarget, widget.pollingInterval),
    [pollComponent, pollTarget, widget.pollingInterval],
  )

  // `live()`: refresh when the followed records change (broadcast), else poll as a fallback.
  useLiveUpdates(widget.live, pollTarget, { polling: Boolean(widget.pollingInterval) })

  const setFilter = (value: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set(`widgetFilters[${widget.id}]`, value)
    router.visit(url.toString(), {
      only: resolvePartialProps(['page']),
      preserveScroll: true,
      preserveState: true,
      replace: true,
    })
  }

  const hasHeader =
    widget.heading ||
    widget.description ||
    widget.filters ||
    widget.filtersForm ||
    widget.collapsible

  return (
    <Card className="gap-4 py-4" data-chart-type={widget.chartType}>
      {hasHeader && (
        <CardHeader className="px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {widget.heading && <CardTitle className="text-base">{widget.heading}</CardTitle>}
              {widget.description && <CardDescription>{widget.description}</CardDescription>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {widget.filters && (
                <select
                  value={widget.filter ?? ''}
                  onChange={(event) => setFilter(event.target.value)}
                  aria-label={t('chart_filter', {}, 'Chart filter')}
                  className="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
                >
                  {widget.filters.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              )}
              {widget.filtersForm && (
                <ChartFilters form={widget.filtersForm} widgetId={widget.id} />
              )}
              {widget.collapsible && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-expanded={!collapsed}
                  aria-controls={bodyId}
                  aria-label={t('toggle_section', {}, 'Toggle section')}
                  onClick={() => setCollapsed((value) => !value)}
                >
                  <ChevronDownIcon
                    className={cn('transition-transform', collapsed && '-rotate-90 rtl:rotate-90')}
                  />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      {!collapsed && (
        <CardContent id={bodyId} className="px-5">
          {widget.empty ? (
            <ChartEmptyState widget={widget} />
          ) : (
            <div
              data-slot="chart-canvas"
              style={{ height: widget.maxHeight ?? '18rem', color: cssColor('gray') }}
            >
              <canvas
                ref={canvas}
                role="img"
                aria-label={widget.heading ?? t('chart', {}, 'Chart')}
                aria-describedby={widget.assistiveContent ? `${bodyId}-assistive` : undefined}
              />
              {widget.assistiveContent && (
                <div
                  id={`${bodyId}-assistive`}
                  className="sr-only"
                  data-slot="chart-assistive-content"
                  dangerouslySetInnerHTML={{ __html: widget.assistiveContent }}
                />
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Shown when `getData()` returns nothing: a registered `$emptyStateView` component, or the
 * icon, texts and `getEmptyStateActions()` (run through the widget, `widget:<id>`).
 */
function ChartEmptyState({ widget }: { widget: ChartWidgetSchema }) {
  const t = useT()
  const registry = useRegistry()
  const page = usePageActionContext()
  const state = widget.emptyState
  const View = state?.view ? registry.resolve(state.view) : undefined
  const minHeight = widget.maxHeight ?? '18rem'

  if (View) {
    return (
      <div data-slot="chart-empty-state" style={{ minHeight }}>
        {createElement(View, { ...(state?.viewData ?? {}), widget })}
      </div>
    )
  }

  return (
    <div
      data-slot="chart-empty-state"
      className="flex flex-col items-center justify-center gap-2 py-10 text-center"
      style={{ minHeight }}
    >
      <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
        {state?.icon ? (
          <Icon name={state.icon} className="size-5" />
        ) : (
          <Icon
            name="alfakit::widgets.chart.empty-state"
            fallback={ChartColumnIcon}
            className="size-5"
          />
        )}
      </div>
      <p className="text-sm font-medium">
        {state?.heading ?? t('chart_empty', {}, 'No data to show')}
      </p>
      {state?.description && <p className="text-muted-foreground text-sm">{state.description}</p>}
      {state?.actions && state.actions.length > 0 && (
        <ActionList
          actions={state.actions}
          context={{ token: page.token, component: `widget:${widget.id}` }}
          size="sm"
          className="mt-2 justify-center"
        />
      )}
    </div>
  )
}
