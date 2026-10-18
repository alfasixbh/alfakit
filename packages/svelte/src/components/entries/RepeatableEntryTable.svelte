<script lang="ts">
  import type { SchemaComponent, TableColumnSchema } from '@alfakit/core'
  import { tableColumnAlignmentClass, tableColumnCells } from '@alfakit/core'
  import { cn } from '../../lib/utils'
  import TableColumnHeaders from '../fields/TableColumnHeaders.svelte'
  import RenderComponent from '../schema/RenderComponent.svelte'

  let { columns, items }: { columns: TableColumnSchema[]; items: SchemaComponent[][] } = $props()

  const rows = $derived(items.map((item) => tableColumnCells(columns, item)))
</script>

<!-- RepeatableEntry items as table rows (`->table([...])`), entry labels for screen readers only. -->
<div
  data-slot="repeatable-entry-table"
  class="bg-card relative overflow-x-auto rounded-lg border shadow-xs"
>
  <table class="w-full border-collapse text-sm">
    <thead class="bg-muted/40">
      <tr><TableColumnHeaders {columns} /></tr>
    </thead>
    <tbody>
      {#each rows as cells, index (index)}
        <tr class="border-t align-top">
          {#each cells as cell, cellIndex (cell?.key ?? `empty-${cellIndex}`)}
            <td
              class={cn(
                'px-3 py-2 [&_[data-slot=entry-label]]:sr-only',
                tableColumnAlignmentClass(columns[cellIndex] ?? {}),
              )}
            >
              {#if cell}<div class="contents"><RenderComponent component={cell} /></div>{/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
