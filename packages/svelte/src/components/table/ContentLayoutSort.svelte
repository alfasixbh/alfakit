<script lang="ts">
  import type { ColumnSchema, TableSchema } from '@alfakit/core'
  import { visitTable } from '@alfakit/core'
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down'
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up'
  import { useT } from '../../context.svelte'
  import { Button } from '../ui/button'

  /**
   * Sorting for content layouts, which have no column headers: a select of the sortable
   * columns and a direction toggle.
   */
  let { table, columns }: { table: TableSchema; columns: ColumnSchema[] } = $props()

  const t = useT()
  const sortable = $derived(columns.filter((column) => column.sortable))
  const direction = $derived(table.sort?.direction ?? 'asc')
  // A default sort on a column the select doesn't list (`created_at`) shows the placeholder.
  const selected = $derived(
    sortable.some((column) => column.name === table.sort?.column) ? (table.sort?.column ?? '') : '',
  )
</script>

{#if sortable.length > 0}
  <div class="flex items-center gap-1">
    <label class="flex items-center gap-2 text-sm">
      <span class="sr-only">{t('table.sort_by', {}, 'Sort by')}</span>
      <select
        value={selected}
        class="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
        onchange={(event) => {
          const value = event.currentTarget.value
          visitTable(
            table.identifier,
            { sort: value || null, direction: value ? direction : null },
            ['page'],
          )
        }}
      >
        <option value="">{table.defaultSortOptionLabel ?? t('table.sort_by', {}, 'Sort by')}</option
        >
        {#each sortable as column (column.name)}
          <option value={column.name}>{column.label}</option>
        {/each}
      </select>
    </label>
    {#if table.sort}
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={direction === 'asc'
          ? t('table.sort_ascending', {}, 'Ascending')
          : t('table.sort_descending', {}, 'Descending')}
        onclick={() =>
          visitTable(
            table.identifier,
            {
              sort: table.sort?.column ?? null,
              direction: direction === 'asc' ? 'desc' : 'asc',
            },
            ['page'],
          )}
      >
        {#if direction === 'asc'}<ArrowUpIcon />{:else}<ArrowDownIcon />{/if}
      </Button>
    {/if}
  </div>
{/if}
