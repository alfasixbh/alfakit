<script setup lang="ts">
import type {
  ActionContext,
  ColumnLayoutNode,
  ColumnSchema,
  TableRecordSchema,
} from '@alfakit/core'
import {
  columnVisibilityClasses,
  layoutNodeGrows,
  layoutVisibilityClasses,
  recordColumnSpanClasses,
  recordGridColumnsClasses,
  splitClasses,
  stackClasses,
} from '@alfakit/core'
import { computed } from 'vue'
import { cn } from '../../lib/utils'
import RecordCell from './RecordCell.vue'

defineOptions({ name: 'ContentLayoutNode' })

const props = defineProps<{
  node: ColumnLayoutNode
  record: TableRecordSchema
  columns: ColumnSchema[]
  token: string
  component: string
  context: ActionContext
  clickable: boolean
  primary: string | null | undefined
  hasRecordAction: boolean
  /** Collapsible panels of this record are open. */
  open: boolean
  /** The node is a child of a `Split`. */
  inSplit?: boolean
}>()
const emit = defineEmits<{ recordClick: [record: TableRecordSchema] }>()

const sizing = computed(() =>
  props.inSplit
    ? layoutNodeGrows(props.node, props.columns)
      ? 'min-w-0 flex-1'
      : 'shrink-0'
    : undefined,
)
const column = computed(() =>
  props.node.type === 'Column'
    ? props.columns.find((item) => item.name === (props.node as { name: string }).name)
    : undefined,
)
// `columnSpan()` / `columnStart()` of a column or layout inside a `Grid`, read against the
// record's width (its `@container`).
const span = computed(() => recordColumnSpanClasses(props.node.columnSpan, props.node.columnStart))
const classes = computed(() => {
  const node = props.node

  switch (node.type) {
    case 'Split':
      return cn(splitClasses(node), layoutVisibilityClasses(node), sizing.value, span.value)
    case 'Stack':
      return cn(stackClasses(node), layoutVisibilityClasses(node), sizing.value, span.value)
    case 'Grid':
      return cn(
        'grid gap-2',
        recordGridColumnsClasses(node.columns),
        layoutVisibilityClasses(node),
        sizing.value,
        span.value,
      )
    case 'Panel':
      return cn(
        'bg-muted/50 flex flex-col gap-2 rounded-lg p-3',
        layoutVisibilityClasses(node),
        sizing.value,
        span.value,
      )
    default:
      return cn(sizing.value, span.value)
  }
})
const layout = computed(() => (props.node.type === 'Column' ? null : props.node))
const hidden = computed(
  () => props.node.type === 'Panel' && Boolean(props.node.collapsible) && !props.open,
)
</script>

<template>
  <div
    v-if="column"
    :data-column="column.name"
    :class="cn(sizing, span, columnVisibilityClasses(column, 'block'))"
  >
    <RecordCell
      :column="column"
      :record="props.record"
      :token="props.token"
      :component="props.component"
      :context="props.context"
      :clickable="props.clickable"
      :primary="column.name === props.primary"
      :has-record-action="props.hasRecordAction"
      @record-click="emit('recordClick', $event)"
    />
  </div>
  <div
    v-else-if="layout && !hidden"
    :data-layout="layout.type.toLowerCase()"
    :class="classes"
    v-bind="layout.extraAttributes"
  >
    <ContentLayoutNode
      v-for="(child, index) in layout.schema"
      :key="child.type === 'Column' ? `column:${child.name}` : `${child.type}:${index}`"
      :node="child"
      :record="props.record"
      :columns="props.columns"
      :token="props.token"
      :component="props.component"
      :context="props.context"
      :clickable="props.clickable"
      :primary="props.primary"
      :has-record-action="props.hasRecordAction"
      :open="props.open"
      :in-split="layout.type === 'Split'"
      @record-click="emit('recordClick', $event)"
    />
  </div>
</template>
