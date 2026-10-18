<script setup lang="ts">
import type { ColumnSchema, TableSchema } from '@alfakit/core'
import { visitTable } from '@alfakit/core'
import { ArrowDownIcon, ArrowUpIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useT } from '../../context'
import Button from '../ui/Button.vue'

/**
 * Sorting for content layouts, which have no column headers: a select of the sortable
 * columns and a direction toggle.
 */
const props = defineProps<{ table: TableSchema; columns: ColumnSchema[] }>()
const t = useT()
const sortable = computed(() => props.columns.filter((column) => column.sortable))
const direction = computed(() => props.table.sort?.direction ?? 'asc')

const sortBy = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  visitTable(
    props.table.identifier,
    { sort: value || null, direction: value ? direction.value : null },
    ['page'],
  )
}
const flip = () =>
  visitTable(
    props.table.identifier,
    {
      sort: props.table.sort?.column ?? null,
      direction: direction.value === 'asc' ? 'desc' : 'asc',
    },
    ['page'],
  )
</script>

<template>
  <div v-if="sortable.length > 0" class="flex items-center gap-1">
    <label class="flex items-center gap-2 text-sm">
      <span class="sr-only">{{ t('table.sort_by', {}, 'Sort by') }}</span>
      <select
        :value="props.table.sort?.column ?? ''"
        class="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
        @change="sortBy"
      >
        <option value="">
          {{ props.table.defaultSortOptionLabel ?? t('table.sort_by', {}, 'Sort by') }}
        </option>
        <option v-for="column in sortable" :key="column.name" :value="column.name">
          {{ column.label }}
        </option>
      </select>
    </label>
    <Button
      v-if="props.table.sort"
      type="button"
      variant="outline"
      size="icon-sm"
      :aria-label="
        direction === 'asc'
          ? t('table.sort_ascending', {}, 'Ascending')
          : t('table.sort_descending', {}, 'Descending')
      "
      @click="flip"
    >
      <ArrowUpIcon v-if="direction === 'asc'" />
      <ArrowDownIcon v-else />
    </Button>
  </div>
</template>
