import type { StatSchema, StatsOverviewWidgetSchema } from '@alfakit/core'
import { gridColumnsClasses, isolationDirection, widgetPollTarget } from '@alfakit/core'
import { Link } from '@inertiajs/react'
import { useEffect } from 'react'
import { usePollComponent } from '../../context'
import { extraProps } from '../../lib/attributes'
import {
  colorClass,
  cssColor,
  iconBackgroundColorClasses,
  textColorClasses,
} from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { NewTabHint } from '../../lib/new-tab-hint'
import { cn } from '../../lib/utils'
import { useLiveUpdates } from '../realtime/live-records-pill'
import { Card } from '../ui/card'

export function StatsOverviewWidget({ widget }: { widget: StatsOverviewWidgetSchema }) {
  const columns = widget.columns ?? {
    default: 1,
    md: Math.min(widget.stats.length, 2),
    lg: Math.min(widget.stats.length, 4),
  }

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

  return (
    <section
      className="flex flex-col gap-3"
      {...(widget.heading ? { 'aria-label': widget.heading } : {})}
    >
      {(widget.heading || widget.description) && (
        <div>
          {widget.heading && <h3 className="text-base font-semibold">{widget.heading}</h3>}
          {widget.description && (
            <p className="text-muted-foreground text-sm">{widget.description}</p>
          )}
        </div>
      )}
      <div className={cn('grid gap-4', gridColumnsClasses(columns))}>
        {widget.stats.map((stat, index) => (
          <StatCard key={index} stat={stat} />
        ))}
      </div>
    </section>
  )
}

function StatCard({ stat }: { stat: StatSchema }) {
  const content = (
    <Card
      {...extraProps(
        stat.extraAttributes,
        cn(
          'relative gap-2 overflow-hidden px-5 py-4',
          stat.url && 'hover:bg-accent/40 transition-colors',
        ),
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm font-medium">
            <bdi>{stat.label}</bdi>
          </span>
          {(stat.value === null || stat.value === '') && stat.placeholder ? (
            <span
              className="text-muted-foreground text-2xl font-semibold tracking-tight"
              data-slot="stat-placeholder"
            >
              {stat.placeholder}
            </span>
          ) : (
            <span
              className={cn(
                'text-2xl font-semibold tracking-tight',
                stat.color && textColorClasses[stat.color],
              )}
            >
              <bdi dir={isolationDirection(stat.value)}>{stat.value}</bdi>
            </span>
          )}
          {stat.description && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs',
                stat.descriptionColor
                  ? textColorClasses[stat.descriptionColor]
                  : 'text-muted-foreground',
              )}
            >
              {stat.descriptionIcon && stat.descriptionIconPosition !== 'after' && (
                <Icon name={stat.descriptionIcon} className="size-3.5" />
              )}
              {/* Mixed-direction text (a Latin "-3% this month" in Arabic) keeps its order. */}
              <bdi dir={isolationDirection(stat.description)}>{stat.description}</bdi>
              {stat.descriptionIcon && stat.descriptionIconPosition === 'after' && (
                <Icon name={stat.descriptionIcon} className="size-3.5" />
              )}
            </span>
          )}
        </div>
        {stat.icon && (
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-md',
              colorClass(iconBackgroundColorClasses, stat.color, 'gray'),
            )}
          >
            <Icon name={stat.icon} className="size-5" />
          </span>
        )}
      </div>
      {stat.chart && stat.chart.length > 1 && (
        <Sparkline data={stat.chart} color={cssColor(stat.chartColor ?? stat.color)} />
      )}
    </Card>
  )

  if (stat.url) {
    return stat.openUrlInNewTab ? (
      <a href={stat.url} target="_blank" rel="noopener noreferrer">
        {content}
        <NewTabHint />
      </a>
    ) : (
      <Link href={stat.url}>{content}</Link>
    )
  }

  return content
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const width = 200
  const height = 40
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map(
    (value, index) =>
      [
        (index / (data.length - 1)) * width,
        height - ((value - min) / range) * (height - 4) - 2,
      ] as const,
  )
  const path = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const area = `${path} L${width},${height} L0,${height} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-1 h-10 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-slot="stat-chart"
    >
      <path
        d={area}
        fill={color}
        data-slot="stat-chart-area"
        style={{ opacity: 'var(--stat-chart-fill-opacity, 0.12)' }}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeLinejoin="round"
        strokeLinecap="round"
        data-slot="stat-chart-line"
        style={{ strokeWidth: 'var(--stat-chart-stroke-width, 2)' }}
      />
    </svg>
  )
}
