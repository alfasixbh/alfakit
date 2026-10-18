<script lang="ts">
  import type { ColumnSchema, ColumnSummariesSchema } from '@alfakit/core'
  import { useFormatter } from '../../context.svelte'
  import { colorClass, textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { TableCell, TableRow } from '../ui/table'

  /** One row of column summaries (`data-slot="table-summary"`). */
  let {
    columns,
    values,
    label,
    leading,
    trailing,
  }: {
    columns: ColumnSchema[]
    values: ColumnSummariesSchema
    /** Shown in the leading cells, or above the first column's values. */
    label?: string
    /** Cells before the columns (selection, reorder handle, leading actions). */
    leading: number
    /** Cells after the columns (trailing actions). */
    trailing: number
  } = $props()

  const format = useFormatter()

  const ALIGN: Record<string, string> = {
    start: 'text-start',
    center: 'text-center',
    end: 'text-end',
    between: 'text-start',
    justify: 'text-justify',
  }
</script>

<TableRow data-slot="table-summary" class="bg-muted/30 hover:bg-muted/30">
  {#if leading > 0}
    <TableCell colspan={leading}>
      {#if label}<span class="text-muted-foreground text-xs font-medium">{label}</span>{/if}
    </TableCell>
  {/if}
  {#each columns as column, index (column.name)}
    <TableCell class={cn('align-top', ALIGN[column.alignment ?? 'start'])}>
      <div class="flex flex-col gap-0.5">
        {#if leading === 0 && index === 0 && label}
          <span class="text-muted-foreground text-xs font-medium">{label}</span>
        {/if}
        {#each values[column.name] ?? [] as summary, position (position)}
          <div class="flex flex-col">
            {#if summary.label}<span
                class={cn('text-muted-foreground text-xs', summary.hiddenLabel && 'sr-only')}
                >{summary.label}</span
              >{/if}
            {#if summary.icons}
              <!-- `Count::icons()`: each icon with how often it occurs. -->
              <span data-slot="summary-icons" class="flex flex-wrap items-center gap-x-3 gap-y-1">
                {#if summary.icons.length === 0}<span class="font-medium">—</span>{/if}
                {#each summary.icons as item, iconIndex (iconIndex)}
                  <span class="inline-flex items-center gap-1">
                    <Icon
                      name={item.icon}
                      class={cn(
                        'size-4',
                        colorClass(textColorClasses, item.color ?? undefined, 'gray'),
                      )}
                    />
                    <span class="font-medium tabular-nums">{format.current.number(item.count)}</span
                    >
                  </span>
                {/each}
              </span>
            {:else}
              <span class="font-medium tabular-nums">{summary.value ?? '—'}</span>
            {/if}
          </div>
        {/each}
      </div>
    </TableCell>
  {/each}
  {#if trailing > 0}<TableCell colspan={trailing} />{/if}
</TableRow>
