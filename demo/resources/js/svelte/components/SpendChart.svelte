<script lang="ts">
    import { cn, useFormatter } from '@alfakit/svelte'
    import { barHeight, summarizeSpend, type SpendChartProps } from '@/shared/sales'

    /**
     * Twelve-month spend bars on the customer profile (`ViewEntry::make('spend')->view('demo-spend-chart')`).
     * PHP computes the months; this component only lays them out and formats the money.
     */
    let { state, currency, labels }: SpendChartProps = $props()

    const format = useFormatter()
    const summary = $derived(summarizeSpend(state))
</script>

{#if summary.months.length === 0 || summary.total === 0}
    <p class="text-muted-foreground text-sm">{labels.empty}</p>
{:else}
    <div data-slot="spend-chart" class="flex flex-col gap-4">
        <dl class="grid grid-cols-3 gap-3 text-sm">
            <div class="flex flex-col gap-0.5">
                <dt class="text-muted-foreground text-xs">{labels.total}</dt>
                <dd class="font-semibold tabular-nums">
                    {format.current.money(summary.total, currency)}
                </dd>
            </div>
            <div class="flex flex-col gap-0.5">
                <dt class="text-muted-foreground text-xs">{labels.average}</dt>
                <dd class="font-semibold tabular-nums">
                    {format.current.money(summary.average, currency)}
                </dd>
            </div>
            <div class="flex flex-col gap-0.5">
                <dt class="text-muted-foreground text-xs">{labels.best}</dt>
                <dd class="font-semibold tabular-nums">
                    {summary.best
                        ? `${summary.best.label} · ${format.current.money(summary.best.total, currency)}`
                        : '—'}
                </dd>
            </div>
        </dl>

        <ol role="img" aria-label={labels.aria} class="flex h-28 items-end gap-1.5 sm:gap-2">
            {#each summary.months as month (month.month)}
                <li class="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <div
                        class={cn(
                            'w-full rounded-t-sm transition-[height]',
                            month.total > 0 ? 'bg-primary' : 'bg-muted',
                        )}
                        style="height: {barHeight(month.total, summary.max)}%"
                        title="{month.label} · {format.current.money(month.total, currency)}"
                    ></div>
                    <span class="text-muted-foreground truncate text-[10px] leading-none"
                        >{month.label}</span
                    >
                </li>
            {/each}
        </ol>
    </div>
{/if}
