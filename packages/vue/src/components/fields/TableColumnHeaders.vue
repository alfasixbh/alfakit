<script setup lang="ts">
import type { TableColumnSchema } from '@alfakit/core'
import { tableColumnAlignmentClass } from '@alfakit/core'
import { cn } from '../../lib/utils'

/** Header cells shared by the Repeater and RepeatableEntry tables. */
const props = defineProps<{ columns: TableColumnSchema[] }>()

// A fixed `width()` (`9rem`, `120px`) is also the column's minimum, so the table scrolls
// sideways instead of squeezing its fields; percentages stay flexible.
const widthStyle = (width?: string | null) =>
  !width ? undefined : width.trim().endsWith('%') ? { width } : { width, minWidth: width }
</script>

<template>
  <th
    v-for="(column, index) in props.columns"
    :key="`${column.name ?? 'column'}-${index}`"
    scope="col"
    :style="widthStyle(column.width)"
    :class="
      cn(
        'text-muted-foreground px-3 py-2 text-xs font-medium',
        tableColumnAlignmentClass(column),
        !column.wrapHeader && 'whitespace-nowrap',
      )
    "
  >
    <span :class="cn(column.hiddenLabel && 'sr-only')">{{ column.label }}</span
    ><span v-if="column.required" class="text-destructive ms-0.5" aria-hidden="true">*</span>
  </th>
</template>
