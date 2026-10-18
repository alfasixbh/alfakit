<script setup lang="ts">
import type { ColumnSchema, ColumnSummariesSchema } from '@alfakit/core'
import { useFormatter } from '../../context'
import { colorClass, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import TableCell from '../ui/TableCell.vue'
import TableRow from '../ui/TableRow.vue'

/** One row of column summaries (`data-slot="table-summary"`). */
const props = defineProps<{
  columns: ColumnSchema[]
  values: ColumnSummariesSchema
  /** Shown in the leading cells, or above the first column's values. */
  label?: string
  /** Cells before the columns (selection, reorder handle, leading actions). */
  leading: number
  /** Cells after the columns (trailing actions). */
  trailing: number
}>()

const formatter = useFormatter()
const format = { number: (value: number) => formatter.value.number(value) }

const ALIGN: Record<string, string> = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
  between: 'text-start',
  justify: 'text-justify',
}
</script>

<template>
  <TableRow data-slot="table-summary" class="bg-muted/30 hover:bg-muted/30">
    <TableCell v-if="props.leading > 0" :colspan="props.leading">
      <span v-if="props.label" class="text-muted-foreground text-xs font-medium">{{
        props.label
      }}</span>
    </TableCell>
    <TableCell
      v-for="(column, index) in props.columns"
      :key="column.name"
      :class="cn('align-top', ALIGN[column.alignment ?? 'start'])"
    >
      <div class="flex flex-col gap-0.5">
        <span
          v-if="props.leading === 0 && index === 0 && props.label"
          class="text-muted-foreground text-xs font-medium"
          >{{ props.label }}</span
        >
        <div
          v-for="(summary, position) in props.values[column.name] ?? []"
          :key="position"
          class="flex flex-col"
        >
          <span
            v-if="summary.label"
            :class="cn('text-muted-foreground text-xs', summary.hiddenLabel && 'sr-only')"
            >{{ summary.label }}</span
          >
          <!-- `Count::icons()`: each icon with how often it occurs. -->
          <span
            v-if="summary.icons"
            data-slot="summary-icons"
            class="flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            <span v-if="summary.icons.length === 0" class="font-medium">—</span>
            <span
              v-for="(item, iconIndex) in summary.icons"
              :key="iconIndex"
              class="inline-flex items-center gap-1"
            >
              <Icon
                :name="item.icon"
                :class="cn('size-4', colorClass(textColorClasses, item.color ?? undefined, 'gray'))"
              />
              <span class="font-medium tabular-nums">{{ format.number(item.count) }}</span>
            </span>
          </span>
          <span v-else class="font-medium tabular-nums">{{ summary.value ?? '—' }}</span>
        </div>
      </div>
    </TableCell>
    <TableCell v-if="props.trailing > 0" :colspan="props.trailing" />
  </TableRow>
</template>
