<script setup lang="ts">
import type { SchemaComponent, TableColumnSchema } from '@alfakit/core'
import { tableColumnAlignmentClass, tableColumnCells } from '@alfakit/core'
import { computed } from 'vue'
import { cn } from '../../lib/utils'
import TableColumnHeaders from '../fields/TableColumnHeaders.vue'
import RenderComponent from '../schema/RenderComponent.vue'

/** RepeatableEntry items as table rows (`->table([...])`), entry labels for screen readers only. */
const props = defineProps<{ columns: TableColumnSchema[]; items: SchemaComponent[][] }>()
const rows = computed(() => props.items.map((item) => tableColumnCells(props.columns, item)))
</script>

<template>
  <div
    data-slot="repeatable-entry-table"
    class="bg-card relative overflow-x-auto rounded-lg border shadow-xs"
  >
    <table class="w-full border-collapse text-sm">
      <thead class="bg-muted/40">
        <tr>
          <TableColumnHeaders :columns="props.columns" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="(cells, index) in rows" :key="index" class="border-t align-top">
          <td
            v-for="(cell, cellIndex) in cells"
            :key="cell?.key ?? `empty-${cellIndex}`"
            :class="
              cn(
                'px-3 py-2 [&_[data-slot=entry-label]]:sr-only',
                tableColumnAlignmentClass(props.columns[cellIndex] ?? {}),
              )
            "
          >
            <div v-if="cell" class="contents"><RenderComponent :component="cell" /></div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
