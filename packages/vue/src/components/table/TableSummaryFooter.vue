<script setup lang="ts">
import type { ColumnSchema, TableSchema, TableSummaryRowSchema } from '@alfakit/core'
import { computed, type HTMLAttributes } from 'vue'
import { useT } from '../../context'
import TableCell from '../ui/TableCell.vue'
import TableRow from '../ui/TableRow.vue'
import TableFooter from '../ui/TableFooter.vue'
import SummaryRow from './SummaryRow.vue'

/** The page and "all records" summary rows below the table body. */
const props = defineProps<{
  table: TableSchema
  columns: ColumnSchema[]
  leading: number
  trailing: number
  class?: HTMLAttributes['class']
}>()

const t = useT()
const rows = computed(() =>
  [props.table.summaries?.page, props.table.summaries?.all].filter(
    (row): row is TableSummaryRowSchema => Boolean(row),
  ),
)
</script>

<template>
  <!-- `deferTotals()`: one placeholder row until the summaries arrive. -->
  <TableFooter
    v-if="rows.length === 0 && props.table.deferredTotals?.summaries"
    :class="props.class"
  >
    <TableRow data-slot="table-summary" aria-busy="true">
      <TableCell :colspan="props.leading + props.columns.length + props.trailing">
        <span
          :aria-label="t('loading', {}, 'Loading')"
          class="bg-muted-foreground/20 block h-4 w-40 animate-pulse rounded-md"
        />
      </TableCell>
    </TableRow>
  </TableFooter>
  <TableFooter v-else-if="rows.length > 0" :class="props.class">
    <SummaryRow
      v-for="row in rows"
      :key="row.label"
      :columns="props.columns"
      :values="row.values"
      :label="row.label"
      :leading="props.leading"
      :trailing="props.trailing"
    />
  </TableFooter>
</template>
