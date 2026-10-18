import type { AnalyticsBreakdownRowSchema, AnalyticsBreakdownWidgetSchema } from '@alfakit/core'
import { analyticsChangeColor, analyticsInitialTab } from '@alfakit/core'
import { Link } from '@inertiajs/react'
import { useState } from 'react'
import { useDirection, useT } from '../../context'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { Card } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

/**
 * An analytics top list (`analytics:breakdown`): a tab per dimension, each row a bar that
 * links to the dashboard filtered by it. Every number arrives formatted by the server.
 */
export function AnalyticsBreakdown({ widget }: { widget: AnalyticsBreakdownWidgetSchema }) {
  const t = useT()
  const direction = useDirection()
  const [active, setActive] = useState(() => analyticsInitialTab(widget))
  const current = widget.tabs.some((tab) => tab.key === active)
    ? active
    : analyticsInitialTab(widget)

  return (
    <Card data-slot="analytics-breakdown" className="gap-0 overflow-hidden py-0">
      <Tabs value={current} onValueChange={setActive} dir={direction} className="gap-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
          <h3 className="text-base font-semibold">{widget.heading}</h3>
          {widget.tabs.length > 1 && (
            <TabsList
              aria-label={t('analytics.views', { panel: widget.heading }, ':panel views')}
              className="max-w-full overflow-x-auto"
            >
              {widget.tabs.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="flex-none"
                  data-filtered={tab.filtered ? 'true' : undefined}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          )}
        </div>
        {widget.tabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="px-3 pb-4">
            <div
              className="text-muted-foreground flex items-center gap-3 px-2 pb-1.5 text-xs font-medium tracking-wide uppercase"
              aria-hidden="true"
            >
              <span className="min-w-0 flex-1 truncate">{tab.columns[0]}</span>
              <span className="w-16 text-end">{tab.columns[1]}</span>
              <span className="hidden w-20 text-end sm:block">{tab.columns[2]}</span>
            </div>
            {tab.rows.length === 0 ? (
              <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                {widget.emptyLabel ?? t('analytics.empty', {}, 'No data for this period')}
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5" aria-label={tab.label}>
                {tab.rows.map((row) => (
                  <li key={row.key}>
                    <BreakdownRow row={row} columns={tab.columns} />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  )
}

function BreakdownRow({ row, columns }: { row: AnalyticsBreakdownRowSchema; columns: string[] }) {
  const t = useT()
  const changeColor = analyticsChangeColor(row.change)
  // Links announce what they do; the visible label is then hidden from screen readers.
  const linkLabel = row.url
    ? row.active
      ? t('analytics.remove_filter', { label: row.label }, 'Remove filter :label')
      : t('analytics.filter_by', { label: row.label }, 'Filter by :label')
    : null

  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-0 start-0 rounded-md transition-colors',
          row.active ? 'bg-primary/20' : 'bg-primary/10 group-hover:bg-primary/15',
        )}
        style={{ width: `${Math.max(0, Math.min(1, row.bar)) * 100}%` }}
      />
      <span className="relative flex min-w-0 flex-1 items-center gap-2">
        {row.flag && <span aria-hidden="true">{row.flag}</span>}
        {linkLabel && <span className="sr-only">{linkLabel}</span>}
        <span className="truncate" title={row.label} aria-hidden={linkLabel ? 'true' : undefined}>
          {row.label}
        </span>
        {row.active && <Icon name="x" className="text-muted-foreground size-3.5 shrink-0" />}
      </span>
      <span className="relative flex w-16 flex-col items-end tabular-nums">
        <span className="sr-only">{columns[1]}: </span>
        <span className="font-medium">{row.display[0]}</span>
        {row.changeDisplay && (
          <span
            className={cn(
              'text-[11px] leading-none',
              changeColor ? textColorClasses[changeColor] : 'text-muted-foreground',
            )}
          >
            {row.changeDisplay}
          </span>
        )}
      </span>
      <span className="text-muted-foreground relative hidden w-20 text-end tabular-nums sm:block">
        <span className="sr-only">{columns[2]}: </span>
        {row.display[1]}
      </span>
    </>
  )

  const className = cn(
    'group relative flex min-h-9 items-center gap-3 rounded-md px-2 py-1.5 text-sm',
    row.active && 'font-medium',
  )

  if (!row.url) {
    return (
      <div className={className} data-slot="analytics-row">
        {content}
      </div>
    )
  }

  return (
    <Link
      href={row.url}
      preserveScroll
      data-slot="analytics-row"
      aria-current={row.active ? 'true' : undefined}
      className={cn(className, 'focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]')}
    >
      {content}
    </Link>
  )
}
