<script lang="ts">
  import type { ColumnSchema, TableSchema, TableSummaryRowSchema } from '@alfakit/core'
  import { useT } from '../../context.svelte'
  import { TableCell, TableFooter, TableRow } from '../ui/table'
  import SummaryRow from './SummaryRow.svelte'

  /** The page and "all records" summary rows below the table body. */
  let {
    table,
    columns,
    leading,
    trailing,
    class: className,
  }: {
    table: TableSchema
    columns: ColumnSchema[]
    leading: number
    trailing: number
    class?: string
  } = $props()

  const t = useT()
  const rows = $derived(
    [table.summaries?.page, table.summaries?.all].filter((row): row is TableSummaryRowSchema =>
      Boolean(row),
    ),
  )
</script>

{#if rows.length === 0 && table.deferredTotals?.summaries}
  <!-- `deferTotals()`: one placeholder row until the summaries arrive. -->
  <TableFooter class={className}>
    <TableRow data-slot="table-summary" aria-busy="true">
      <TableCell colspan={leading + columns.length + trailing}>
        <span
          aria-label={t('loading', {}, 'Loading')}
          class="bg-muted-foreground/20 block h-4 w-40 animate-pulse rounded-md"
        ></span>
      </TableCell>
    </TableRow>
  </TableFooter>
{:else if rows.length > 0}
  <TableFooter class={className}>
    {#each rows as row (row.label)}
      <SummaryRow {columns} values={row.values} label={row.label} {leading} {trailing} />
    {/each}
  </TableFooter>
{/if}
