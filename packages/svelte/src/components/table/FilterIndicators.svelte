<script lang="ts">
  import { uniqueKey } from '../../lib/keys'
  import type { TableSchema } from '@alfakit/core'
  import {
    removeAllFilterIndicators,
    removeFilterIndicator,
    triggerButtonView,
    visitTable,
  } from '@alfakit/core'
  import XIcon from '@lucide/svelte/icons/x'
  import { cn } from '../../lib/utils'
  import Icon from '../../lib/Icon.svelte'
  import { Badge } from '../ui/badge'
  import { useT } from '../../context.svelte'
  import TableTriggerButton from './TableTriggerButton.svelte'

  let { table }: { table: TableSchema } = $props()

  const indicators = $derived(table.filterIndicators ?? [])

  const t = useT()

  // `filtersRemoveAllAction()`; shown while any indicator can be removed.
  const removeAll = $derived(
    indicators.some((indicator) => indicator.removable !== false)
      ? triggerButtonView(table, 'filtersRemoveAll', {
          label: t('table.remove_all_filters', {}, 'Remove all filters'),
          showLabel: false,
          variant: 'ghost',
        })
      : null,
  )
</script>

{#snippet xIcon()}<Icon
    name="alfakit::tables.filters.remove-all-button"
    fallback={XIcon}
  />{/snippet}

{#if indicators.length > 0}
  <div class="flex flex-wrap items-center gap-2" data-slot="filter-indicators">
    {#each indicators as indicator, indicatorIndex (uniqueKey(indicators, indicatorIndex, (item) => `${item.filter}\u0000${item.removeField ?? ''}\u0000${item.label}`))}
      <Badge variant="secondary" class={cn('gap-1', indicator.removable !== false && 'pe-1')}>
        {indicator.label}
        {#if indicator.removable !== false}
          <button
            type="button"
            aria-label={`${t('table.remove_filter', {}, 'Remove filter')}: ${indicator.label}`}
            class="hover:bg-foreground/10 rounded-sm"
            onclick={() =>
              visitTable(
                table.identifier,
                { filters: removeFilterIndicator(table.filterState, indicator) },
                ['page'],
              )}
          >
            <XIcon class="size-3" />
          </button>
        {/if}
      </Badge>
    {/each}
    {#if removeAll}
      <TableTriggerButton
        view={removeAll}
        defaultIcon={xIcon}
        data-slot="filters-remove-all"
        onclick={() =>
          visitTable(
            table.identifier,
            { filters: removeAllFilterIndicators(table.filterState, table.filterIndicators) },
            ['page'],
          )}
      />
    {/if}
  </div>
{/if}
