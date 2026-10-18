<script lang="ts">
  import type { AnalyticsBreakdownRowSchema } from '@alfakit/core'
  import { analyticsChangeColor } from '@alfakit/core'
  import { Link } from '@inertiajs/svelte'
  import { useT } from '../../context.svelte'
  import { textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'

  let { row, columns }: { row: AnalyticsBreakdownRowSchema; columns: string[] } = $props()

  const t = useT()
  const changeColor = $derived(analyticsChangeColor(row.change))
  // Links announce what they do; the visible label is then hidden from screen readers.
  const linkLabel = $derived(
    row.url
      ? row.active
        ? t('analytics.remove_filter', { label: row.label }, 'Remove filter :label')
        : t('analytics.filter_by', { label: row.label }, 'Filter by :label')
      : null,
  )
  const rowClass = $derived(
    cn(
      'group relative flex min-h-9 items-center gap-3 rounded-md px-2 py-1.5 text-sm',
      row.active && 'font-medium',
      row.url && 'focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
    ),
  )
  const width = $derived(`${Math.max(0, Math.min(1, row.bar)) * 100}%`)
</script>

{#snippet content()}
  <span
    aria-hidden="true"
    class={cn(
      'pointer-events-none absolute inset-y-0 start-0 rounded-md transition-colors',
      row.active ? 'bg-primary/20' : 'bg-primary/10 group-hover:bg-primary/15',
    )}
    style:width
  ></span>
  <span class="relative flex min-w-0 flex-1 items-center gap-2">
    {#if row.flag}<span aria-hidden="true">{row.flag}</span>{/if}
    {#if linkLabel}<span class="sr-only">{linkLabel}</span>{/if}
    <span class="truncate" title={row.label} aria-hidden={linkLabel ? 'true' : undefined}
      >{row.label}</span
    >
    {#if row.active}<Icon name="x" class="text-muted-foreground size-3.5 shrink-0" />{/if}
  </span>
  <span class="relative flex w-16 flex-col items-end tabular-nums">
    <span class="sr-only">{columns[1]}: </span>
    <span class="font-medium">{row.display[0]}</span>
    {#if row.changeDisplay}
      <span
        class={cn(
          'text-[11px] leading-none',
          changeColor ? textColorClasses[changeColor] : 'text-muted-foreground',
        )}
      >
        {row.changeDisplay}
      </span>
    {/if}
  </span>
  <span class="text-muted-foreground relative hidden w-20 text-end tabular-nums sm:block">
    <span class="sr-only">{columns[2]}: </span>
    {row.display[1]}
  </span>
{/snippet}

{#if row.url}
  <Link
    href={row.url}
    preserveScroll
    data-slot="analytics-row"
    aria-current={row.active ? 'true' : undefined}
    class={rowClass}
  >
    {@render content()}
  </Link>
{:else}
  <div data-slot="analytics-row" class={rowClass}>{@render content()}</div>
{/if}
