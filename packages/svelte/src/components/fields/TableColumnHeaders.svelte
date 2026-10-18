<script lang="ts">
  import type { TableColumnSchema } from '@alfakit/core'
  import { tableColumnAlignmentClass } from '@alfakit/core'
  import { cn } from '../../lib/utils'

  let { columns }: { columns: TableColumnSchema[] } = $props()
</script>

<!-- Header cells shared by the Repeater and RepeatableEntry tables. -->
{#each columns as column, index (`${column.name ?? 'column'}-${index}`)}
  <th
    scope="col"
    style={column.width ? `width: ${column.width}` : undefined}
    class={cn(
      'text-muted-foreground px-3 py-2 text-xs font-medium',
      tableColumnAlignmentClass(column),
      !column.wrapHeader && 'whitespace-nowrap',
    )}
  >
    <span class={cn(column.hiddenLabel && 'sr-only')}>{column.label}</span
    >{#if column.required}<span class="text-destructive ms-0.5" aria-hidden="true">*</span>{/if}
  </th>
{/each}
