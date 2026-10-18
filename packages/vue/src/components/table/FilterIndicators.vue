<script setup lang="ts">
import type { FilterIndicator, TableSchema } from '@alfakit/core'
import {
  removeAllFilterIndicators,
  removeFilterIndicator,
  triggerButtonView,
  visitTable,
} from '@alfakit/core'
import { XIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Badge from '../ui/Badge.vue'
import TableTriggerButton from './TableTriggerButton.vue'

const props = defineProps<{ table: TableSchema }>()
const t = useT()
const indicators = computed(() => props.table.filterIndicators ?? [])

// `filtersRemoveAllAction()`; shown while any indicator can be removed.
const removeAll = computed(() =>
  indicators.value.some((indicator) => indicator.removable !== false)
    ? triggerButtonView(props.table, 'filtersRemoveAll', {
        label: t('table.remove_all_filters', {}, 'Remove all filters'),
        showLabel: false,
        variant: 'ghost',
      })
    : null,
)

// `Indicator::removeField()` clears only that field of the filter.
const remove = (indicator: FilterIndicator) =>
  visitTable(
    props.table.identifier,
    { filters: removeFilterIndicator(props.table.filterState, indicator) },
    ['page'],
  )
const clearAll = () =>
  visitTable(
    props.table.identifier,
    { filters: removeAllFilterIndicators(props.table.filterState, props.table.filterIndicators) },
    ['page'],
  )
</script>

<template>
  <div
    v-if="indicators.length > 0"
    class="flex flex-wrap items-center gap-2"
    data-slot="filter-indicators"
  >
    <Badge
      v-for="indicator in indicators"
      :key="`${indicator.filter}-${indicator.removeField ?? ''}-${indicator.label}`"
      variant="secondary"
      :class="cn('gap-1', indicator.removable !== false && 'pe-1')"
    >
      {{ indicator.label }}
      <button
        v-if="indicator.removable !== false"
        type="button"
        :aria-label="`${t('table.remove_filter', {}, 'Remove filter')}: ${indicator.label}`"
        class="hover:bg-foreground/10 rounded-sm"
        @click="remove(indicator)"
      >
        <XIcon class="size-3" />
      </button>
    </Badge>
    <TableTriggerButton
      v-if="removeAll"
      :view="removeAll"
      data-slot="filters-remove-all"
      @click="clearAll"
    >
      <template #icon
        ><Icon name="alfakit::tables.filters.remove-all-button" :fallback="XIcon"
      /></template>
    </TableTriggerButton>
  </div>
</template>
