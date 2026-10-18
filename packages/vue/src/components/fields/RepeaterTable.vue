<script setup lang="ts">
import type {
  ActionContext,
  ActionSchema,
  ItemActionName,
  ItemActionSchema,
  SchemaComponent,
  TableColumnSchema,
} from '@alfakit/core'
import { resolveItemAction, tableColumnAlignmentClass, tableColumnCells } from '@alfakit/core'
import { computed } from 'vue'
import type { VirtualListBinding } from '../../composables/use-virtual-list'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import RenderComponent from '../schema/RenderComponent.vue'
import VirtualSpacerRow from '../schema/VirtualSpacerRow.vue'
import ItemHeaderActions from './ItemHeaderActions.vue'
import { useItemActionFallbacks } from './item-actions'
import TableColumnHeaders from './TableColumnHeaders.vue'

/**
 * Repeater items as table rows (`->table([...])`): one cell per item field, labels kept
 * for screen readers only, and the row controls in the last column.
 */
const props = defineProps<{
  id: string
  columns: TableColumnSchema[]
  count: number
  prefixFor: (index: number) => string
  schemaFor: (index: number) => SchemaComponent[]
  labelledBy?: string
  describedBy?: string
  reorderable: boolean
  cloneable: boolean
  deletable: boolean
  /** `compact()`: tighter cells. */
  compact?: boolean
  /** Windowed rows for long lists (see `useVirtualList`). */
  virtual: VirtualListBinding
  /** The field action context item actions run in. */
  context?: ActionContext
  /** The built-in action `name` of the row at `index` (null when hidden). */
  resolve?: (name: ItemActionName, index: number) => ItemActionSchema | null
  /** `extraItemActions()` of the row at `index`. */
  extraActionsFor?: (index: number) => ActionSchema[] | undefined
}>()
const emit = defineEmits<{
  move: [from: number, to: number]
  clone: [index: number]
  remove: [index: number]
}>()
const t = useT()
const fallbacks = useItemActionFallbacks()
const resolveAction = (name: ItemActionName, index: number) =>
  props.resolve
    ? props.resolve(name, index)
    : resolveItemAction(name, {}, undefined, fallbacks[name])
const hasExtraActions = computed(() =>
  Boolean(
    props.extraActionsFor &&
    props.virtual.indexes.value.some((index) => props.extraActionsFor?.(index)?.length),
  ),
)
const hasControls = computed(
  () => props.reorderable || props.cloneable || props.deletable || hasExtraActions.value,
)
const cellCount = computed(() => props.columns.length + Number(hasControls.value))
const cellsFor = (index: number) =>
  tableColumnCells(props.columns, props.schemaFor(index), props.prefixFor(index))
</script>

<template>
  <div
    data-slot="repeater-table"
    :data-compact="props.compact || undefined"
    class="bg-card relative overflow-x-auto rounded-lg border shadow-xs"
  >
    <table
      :id="props.id"
      :aria-labelledby="props.labelledBy"
      :aria-describedby="props.describedBy"
      :aria-rowcount="props.virtual.range.value.active ? props.count + 1 : undefined"
      class="w-full border-collapse text-sm"
    >
      <thead class="bg-muted/40">
        <tr>
          <TableColumnHeaders :columns="props.columns" />
          <th v-if="hasControls" scope="col" class="w-px px-2 py-2">
            <span class="sr-only">{{ t('actions', {}, 'Actions') }}</span>
          </th>
        </tr>
      </thead>
      <tbody :ref="props.virtual.attach">
        <VirtualSpacerRow :height="props.virtual.range.value.before" :col-span="cellCount" />
        <tr
          v-for="index in props.virtual.indexes.value"
          :key="index"
          :ref="props.virtual.item"
          :data-index="index"
          :aria-rowindex="props.virtual.range.value.active ? index + 2 : undefined"
          data-slot="repeater-row"
          class="border-t align-top"
        >
          <td
            v-for="(cell, cellIndex) in cellsFor(index)"
            :key="cell?.key ?? `empty-${cellIndex}`"
            :class="
              cn(
                props.compact ? 'px-1.5 py-1' : 'px-3 py-2',
                '[&_[data-slot=label]]:sr-only',
                tableColumnAlignmentClass(props.columns[cellIndex] ?? {}),
              )
            "
          >
            <RenderComponent v-if="cell" :component="cell" />
          </td>
          <td v-if="hasControls" :class="props.compact ? 'px-1 py-1' : 'px-2 py-2'">
            <div class="flex items-center justify-end">
              <ItemHeaderActions
                :context="props.context ?? { token: '' }"
                :item-key="String(index)"
                :index="index"
                :count="props.count"
                :resolve="(name: ItemActionName) => resolveAction(name, index)"
                :extra-actions="props.extraActionsFor?.(index)"
                :buttons="props.reorderable"
                :can-clone="props.cloneable"
                :can-delete="props.deletable"
                :collapsible="false"
                :collapsed="false"
                @move="(from: number, to: number) => emit('move', from, to)"
                @clone="emit('clone', index)"
                @delete="emit('remove', index)"
              />
            </div>
          </td>
        </tr>
        <VirtualSpacerRow :height="props.virtual.range.value.after" :col-span="cellCount" />
      </tbody>
    </table>
  </div>
</template>
