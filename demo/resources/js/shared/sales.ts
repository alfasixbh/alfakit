/**
 * Props of the sales area's custom components, serialised by PHP. The customer profile's
 * spend chart receives twelve months (oldest first) through `ViewEntry::make('spend')`;
 * `state` is the entry's state, the rest comes from `viewData()`.
 */
export interface SpendMonth {
    month: string
    label: string
    total: number
    orders: number
}

export interface SpendChartLabels {
    aria: string
    total: string
    average: string
    best: string
    empty: string
}

export interface SpendChartProps {
    state: SpendMonth[] | null
    currency: string
    labels: SpendChartLabels
}

export interface SpendSummary {
    months: SpendMonth[]
    total: number
    average: number
    best: SpendMonth | null
    max: number
}

/** Totals derived from the months; the server already sanitised the numbers. */
export function summarizeSpend(state: SpendMonth[] | null): SpendSummary {
    const months = state ?? []
    const total = months.reduce((sum, month) => sum + month.total, 0)
    const active = months.filter((month) => month.total > 0)
    const best = active.length
        ? active.reduce((top, month) => (month.total > top.total ? month : top))
        : null

    return {
        months,
        total,
        average: months.length ? total / months.length : 0,
        best,
        max: Math.max(0, ...months.map((month) => month.total)),
    }
}

/** Bar height as a percentage of the tallest month (never 0 so empty months stay visible). */
export function barHeight(total: number, max: number): number {
    if (max <= 0) {
        return 4
    }

    return Math.max(4, Math.round((total / max) * 100))
}
