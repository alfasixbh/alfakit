<script setup lang="ts">
import type {
  ActionContext,
  ColumnLayoutNode,
  ColumnSchema,
  SelectionState,
  TableRecordSchema,
  TableSchema,
  TableSelection,
} from '@alfakit/core'
import {
  VIRTUAL_ESTIMATES,
  contentGridClasses,
  primaryColumnName,
  recordActionsAtStart,
  virtualizeOptions,
} from '@alfakit/core'
import { ChevronDownIcon } from '@lucide/vue'
import { computed, reactive, useId } from 'vue'
import { useVirtualList } from '../../composables/use-virtual-list'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import ActionList from '../actions/ActionList.vue'
import Button from '../ui/Button.vue'
import Checkbox from '../ui/Checkbox.vue'
import ContentLayoutNode from './ContentLayoutNode.vue'

/**
 * Records arranged by a content layout (`Split`, `Stack`, `Panel`, `Grid`) instead of a
 * row of cells, optionally as cards in a `contentGrid()`. Long pages render only the
 * records in view (plus a few around them), by whole rows of the card grid; the list keeps
 * `aria-setsize` / `aria-posinset` so assistive technology knows the real positions.
 */
const props = defineProps<{
  table: TableSchema
  records: TableRecordSchema[]
  columns: ColumnSchema[]
  token: string
  component: string
  context: ActionContext
  selectable: boolean
  selection: TableSelection
  selectionState: SelectionState
}>()
const emit = defineEmits<{ recordClick: [record: TableRecordSchema] }>()
const t = useT()
const panelId = useId()
const virtual = useVirtualList(
  () => props.records.length,
  () =>
    virtualizeOptions(
      props.table.virtualize,
      VIRTUAL_ESTIMATES.item,
      props.table.contentGrid ? 16 : 0,
      props.table.contentGrid ? 'auto' : 1,
    ),
)

// The records inside the window, with their index in the full list.
const windowed = computed(() =>
  virtual.indexes.value.flatMap((index) => {
    const record = props.records[index]

    return record ? [{ record, index }] : []
  }),
)

const layout = computed(() => props.table.contentLayout ?? [])
const hasCollapsible = (nodes: ColumnLayoutNode[]): boolean =>
  nodes.some(
    (node) =>
      node.type !== 'Column' &&
      ((node.type === 'Panel' && Boolean(node.collapsible)) || hasCollapsible(node.schema)),
  )
const collapsible = computed(() => hasCollapsible(layout.value))
const startsOpen = computed(() =>
  layout.value.some((node) => node.type === 'Panel' && node.collapsible && !node.collapsed),
)
// Collapsible panels at the top level go under the record's main row.
const main = computed(() =>
  layout.value.filter((node) => !(node.type === 'Panel' && node.collapsible)),
)
const details = computed(() =>
  layout.value.filter((node) => node.type === 'Panel' && node.collapsible),
)
const opened = reactive<Record<string, boolean>>({})
const isOpen = (record: TableRecordSchema) => opened[String(record.key)] ?? startsOpen.value
const primary = computed(() => primaryColumnName(props.columns))
const clickable = (record: TableRecordSchema) => Boolean(record.url || props.table.recordAction)
const isSelected = (record: TableRecordSchema) =>
  props.selectionState.allSelected || props.selectionState.selected.has(String(record.key))
const atStart = computed(() => recordActionsAtStart(props.table.recordActionsPosition))
const nodeKey = (node: ColumnLayoutNode, index: number) =>
  node.type === 'Column' ? `column:${node.name}` : `${node.type}:${index}`
</script>

<template>
  <!-- `contentGrid()` breakpoints follow the table's width (this `@container`), not the
       viewport's: beside the sidebar and a cluster's sub-navigation the table can be narrow. -->
  <div data-slot="table-content-container" class="@container">
    <div
      :ref="virtual.attach"
      data-slot="table-content"
      :style="virtual.style.value"
      :role="virtual.range.value.active ? 'list' : undefined"
      :class="
        cn(
          props.table.contentGrid
            ? cn('grid gap-4 p-4', contentGridClasses(props.table.contentGrid))
            : 'divide-y',
        )
      "
    >
      <div
        v-for="{ record, index } in windowed"
        :key="String(record.key)"
        :ref="virtual.item"
        :data-index="index"
        :role="virtual.range.value.active ? 'listitem' : undefined"
        :aria-setsize="virtual.range.value.active ? props.records.length : undefined"
        :aria-posinset="virtual.range.value.active ? index + 1 : undefined"
        data-slot="table-record"
        :data-state="isSelected(record) ? 'selected' : undefined"
        :class="
          cn(
            'flex flex-col gap-3 p-4',
            props.table.contentGrid && 'bg-card rounded-lg border shadow-xs',
            clickable(record) && 'hover:bg-muted/40 cursor-pointer',
            isSelected(record) && 'bg-muted/60',
            record.classes,
          )
        "
        @click="clickable(record) && emit('recordClick', record)"
      >
        <!-- The actions keep their natural width beside the record's text and wrap onto a line
           of their own when the card is too narrow for both, so they never overlap the text. -->
        <div class="flex flex-wrap items-start gap-3">
          <div
            v-if="record.actions?.length && props.table.recordActionsPosition === 'before-cells'"
            data-slot="record-actions"
            class="max-w-full min-w-0"
            @click.stop
          >
            <ActionList
              :actions="record.actions"
              :context="{ ...props.context, record: record.key }"
              size="sm"
              align="end"
            />
          </div>
          <div v-if="props.selectable" class="pt-0.5" @click.stop>
            <Checkbox
              v-if="record.selectable !== false"
              :model-value="isSelected(record)"
              :aria-label="t('table.select_row', {}, 'Select row')"
              @update:model-value="props.selection.toggle(record.key, $event === true)"
            />
          </div>
          <div
            v-if="record.actions?.length && props.table.recordActionsPosition === 'before-columns'"
            data-slot="record-actions"
            class="max-w-full min-w-0"
            @click.stop
          >
            <ActionList
              :actions="record.actions"
              :context="{ ...props.context, record: record.key }"
              size="sm"
              align="end"
            />
          </div>
          <!-- The text takes the remaining width (at least 15rem before the actions wrap, so a
          name is not broken mid-word beside them). -->
          <div
            data-slot="record-content"
            class="flex min-w-0 grow basis-60 flex-col gap-3 break-words"
          >
            <ContentLayoutNode
              v-for="(node, nodeIndex) in main"
              :key="nodeKey(node, nodeIndex)"
              :node="node"
              :record="record"
              :columns="props.columns"
              :token="props.token"
              :component="props.component"
              :context="props.context"
              :clickable="clickable(record)"
              :primary="primary"
              :has-record-action="Boolean(props.table.recordAction)"
              :open="isOpen(record)"
              @record-click="emit('recordClick', $event)"
            />
          </div>
          <div
            v-if="(record.actions?.length && !atStart) || collapsible"
            class="ms-auto flex max-w-full min-w-0 items-start gap-3"
          >
            <div
              v-if="record.actions?.length && !atStart"
              data-slot="record-actions"
              class="max-w-full min-w-0"
              @click.stop
            >
              <ActionList
                :actions="record.actions"
                :context="{ ...props.context, record: record.key }"
                size="sm"
                align="end"
              />
            </div>
            <Button
              v-if="collapsible"
              type="button"
              variant="ghost"
              size="icon-sm"
              class="shrink-0"
              :aria-expanded="isOpen(record)"
              :aria-controls="isOpen(record) ? `${panelId}-${record.key}` : undefined"
              :aria-label="
                isOpen(record)
                  ? t('table.hide_details', {}, 'Hide details')
                  : t('table.show_details', {}, 'Show details')
              "
              @click.stop="opened[String(record.key)] = !isOpen(record)"
            >
              <ChevronDownIcon
                :class="cn('transition-transform', isOpen(record) && 'rotate-180')"
              />
            </Button>
          </div>
        </div>
        <div
          v-if="isOpen(record) && details.length > 0"
          :id="`${panelId}-${record.key}`"
          class="flex flex-col gap-3"
        >
          <ContentLayoutNode
            v-for="(node, nodeIndex) in details"
            :key="nodeKey(node, main.length + nodeIndex)"
            :node="node"
            :record="record"
            :columns="props.columns"
            :token="props.token"
            :component="props.component"
            :context="props.context"
            :clickable="clickable(record)"
            :primary="primary"
            :has-record-action="Boolean(props.table.recordAction)"
            :open="true"
            @record-click="emit('recordClick', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
