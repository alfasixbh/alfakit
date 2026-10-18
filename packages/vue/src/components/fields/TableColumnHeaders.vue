<script setup lang="ts">
import type { TableColumnSchema } from '@alfakit/core'
import { tableColumnAlignmentClass } from '@alfakit/core'
import { cn } from '../../lib/utils'

/** Header cells shared by the Repeater and RepeatableEntry tables. */
const props = defineProps<{ columns: TableColumnSchema[] }>()
</script>

<template>
  <th
    v-for="(column, index) in props.columns"
    :key="`${column.name ?? 'column'}-${index}`"
    scope="col"
    :style="column.width ? { width: column.width } : undefined"
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
