<script setup lang="ts">
import type { ColumnSchema, TableSchema } from '@alfakit/core'
import { ariaSort, columnVisibilityClasses, visitTable } from '@alfakit/core'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from '@lucide/vue'
import { createReusableTemplate } from '@vueuse/core'
import { ref } from 'vue'
import { useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Slot from '../panel/Slot.vue'
import Input from '../ui/Input.vue'
import Spinner from '../ui/Spinner.vue'
import TableHead from '../ui/TableHead.vue'

const ALIGN: Record<string, string> = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
  between: 'text-start',
  justify: 'text-justify',
}

/** A column's header cell: label, sort button and individual search input. */
const props = defineProps<{
  table: TableSchema
  column: ColumnSchema
  rowSpan?: number
  /** The table's component key (`relationManager:<class>`, `widget:<id>`), for slots. */
  component?: string | null
}>()
const t = useT()
const [DefineLabel, ColumnHeaderLabel] = createReusableTemplate()

// A spinner replaces the sort icon until the sorted records arrive.
const sorting = ref(false)

const sort = () => {
  const direction =
    props.table.sort?.column === props.column.name && props.table.sort.direction === 'asc'
      ? 'desc'
      : 'asc'
  sorting.value = true
  visitTable(props.table.identifier, { sort: props.column.name, direction }, ['page'], {
    onFinish: () => {
      sorting.value = false
    },
  })
}

const columnSearch = (event: Event) => {
  visitTable(
    props.table.identifier,
    {
      columnSearch: {
        ...(props.table.columnSearches ?? {}),
        [props.column.name]: (event.target as HTMLInputElement).value,
      },
    },
    ['page'],
  )
}
</script>

<template>
  <DefineLabel>
    <button
      v-if="props.column.sortable"
      type="button"
      class="hover:text-foreground inline-flex items-center gap-1"
      :aria-busy="sorting || undefined"
      @click="sort"
    >
      {{ props.column.label }}
      <Spinner v-if="sorting" data-slot="table-sort-spinner" class="size-3.5" />
      <template v-else-if="props.table.sort?.column === props.column.name">
        <Icon
          v-if="props.table.sort?.direction === 'asc'"
          name="alfakit::tables.header-cell.sort-asc-button"
          :fallback="ArrowUpIcon"
          class="size-3.5"
          aria-hidden="true"
        />
        <Icon
          v-else
          name="alfakit::tables.header-cell.sort-desc-button"
          :fallback="ArrowDownIcon"
          class="size-3.5"
          aria-hidden="true"
        />
      </template>
      <Icon
        v-else
        name="alfakit::tables.header-cell.sort-button"
        :fallback="ArrowUpDownIcon"
        class="size-3.5 opacity-40"
        aria-hidden="true"
      />
    </button>
    <template v-else>{{ props.column.label }}</template>
  </DefineLabel>
  <TableHead
    :rowspan="props.rowSpan"
    :class="
      cn(
        ALIGN[props.column.alignment ?? 'start'],
        props.column.wrapHeader ? 'whitespace-normal' : undefined,
        props.column.grow === false && 'w-0',
        columnVisibilityClasses(props.column),
      )
    "
    :style="props.column.width ? { width: props.column.width } : undefined"
    :aria-sort="
      props.column.sortable
        ? ariaSort(props.column.name, props.table.sort?.column, props.table.sort?.direction)
        : undefined
    "
    v-bind="props.column.extraHeaderAttributes"
  >
    <div class="flex flex-col gap-1">
      <span
        v-if="props.column.headerTooltip"
        :title="props.column.headerTooltip"
        data-slot="header-tooltip"
      >
        <ColumnHeaderLabel />
        <span class="sr-only"> ({{ props.column.headerTooltip }})</span>
      </span>
      <ColumnHeaderLabel v-else />
      <Slot
        name="table.header-cell"
        :scope="props.component"
        :data="{ column: props.column.name }"
      />
      <Input
        v-if="props.column.searchable"
        type="search"
        :model-value="props.table.columnSearches?.[props.column.name] ?? ''"
        :placeholder="t('search', {}, 'Search')"
        :aria-label="`${t('search', {}, 'Search')} ${props.column.label}`"
        class="h-7 text-xs font-normal"
        @keydown.enter="columnSearch"
      />
    </div>
  </TableHead>
</template>
