import { STOCK_TONE_CLASSES, stockLevel, type StockMeterProps } from '@/shared/showcase'
import { cn, useFormatter } from '@alfakit/react'

/**
 * `ViewColumn::make('stock_level')->view('demo-stock-meter')`: a small meter next to the
 * stock figure, coloured by level. PHP sends `stock`, `max` and `low` per record.
 */
export default function StockMeter(props: StockMeterProps) {
    const format = useFormatter()
    const level = stockLevel(props)
    const stock = Number(props.stock ?? props.state ?? 0)

    return (
        <div className="flex items-center gap-2" data-slot="stock-meter" data-tone={level.tone}>
            <div
                role="meter"
                aria-valuemin={0}
                aria-valuemax={props.max ?? 120}
                aria-valuenow={stock}
                aria-valuetext={format.number(stock)}
                className="bg-muted h-1.5 w-20 overflow-hidden rounded-full"
            >
                <div
                    className={cn(
                        'h-full rounded-full transition-[width]',
                        STOCK_TONE_CLASSES[level.tone],
                    )}
                    style={{ width: `${level.percent}%` }}
                />
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">{level.percent}%</span>
        </div>
    )
}
