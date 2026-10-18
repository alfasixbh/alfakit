import { barHeight, summarizeSpend, type SpendChartProps } from '@/shared/sales'
import { cn, useFormatter } from '@alfakit/react'

/**
 * Twelve-month spend bars on the customer profile (`ViewEntry::make('spend')->view('demo-spend-chart')`).
 * PHP computes the months; this component only lays them out and formats the money.
 */
export default function SpendChart({ state, currency, labels }: SpendChartProps) {
    const format = useFormatter()
    const { months, total, average, best, max } = summarizeSpend(state)

    if (months.length === 0 || total === 0) {
        return <p className="text-muted-foreground text-sm">{labels.empty}</p>
    }

    return (
        <div data-slot="spend-chart" className="flex flex-col gap-4">
            <dl className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground text-xs">{labels.total}</dt>
                    <dd className="font-semibold tabular-nums">{format.money(total, currency)}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground text-xs">{labels.average}</dt>
                    <dd className="font-semibold tabular-nums">
                        {format.money(average, currency)}
                    </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground text-xs">{labels.best}</dt>
                    <dd className="font-semibold tabular-nums">
                        {best ? `${best.label} · ${format.money(best.total, currency)}` : '—'}
                    </dd>
                </div>
            </dl>

            <ol
                role="img"
                aria-label={labels.aria}
                className="flex h-28 items-end gap-1.5 sm:gap-2"
            >
                {months.map((month) => (
                    <li
                        key={month.month}
                        className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                    >
                        <div
                            className={cn(
                                'w-full rounded-t-sm transition-[height]',
                                month.total > 0 ? 'bg-primary' : 'bg-muted',
                            )}
                            style={{ height: `${barHeight(month.total, max)}%` }}
                            title={`${month.label} · ${format.money(month.total, currency)}`}
                        />
                        <span className="text-muted-foreground truncate text-[10px] leading-none">
                            {month.label}
                        </span>
                    </li>
                ))}
            </ol>
        </div>
    )
}
