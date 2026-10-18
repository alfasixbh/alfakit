<script setup lang="ts">
import type { RepeaterSchema, SchemaComponent } from '@alfakit/core'
import {
  isDeferredPlaceholder,
  VIRTUAL_ESTIMATES,
  appendRepeaterItem,
  fieldIds,
  cloneIndexedState,
  cloneRepeaterItem,
  gridColumnsClasses,
  moveIndexedState,
  moveRepeaterItem,
  removeIndexedState,
  removeRepeaterItem,
  reorderedItemKeys,
  replacePlaceholder,
  resolveItemAction,
  virtualizeOptions,
  type ItemActionName,
} from '@alfakit/core'
import { computed, ref } from 'vue'
import { useScrollToErroredItem, useVirtualList } from '../../composables/use-virtual-list'
import { useFormatter } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import DeferredSchema from '../layout/DeferredSchema.vue'
import { useField } from '../form/form-context'
import { useFieldActionContext } from '../schema/field-actions'
import FieldWrapper from '../schema/FieldWrapper.vue'
import SchemaRenderer from '../schema/SchemaRenderer.vue'
import Collapsible from '../ui/Collapsible.vue'
import CollapsibleContent from '../ui/CollapsibleContent.vue'
import AddActionRow from './AddActionRow.vue'
import CollapseAllActions from './CollapseAllActions.vue'
import ItemActionButton from './ItemActionButton.vue'
import ItemHeaderActions from './ItemHeaderActions.vue'
import { useItemActionFallbacks, useItemMoves, useRunItemAction } from './item-actions'
import RepeaterTable from './RepeaterTable.vue'

/**
 * Items use the per-index schema from the server when available (so closures see item
 * state) and fall back to the template for freshly added items.
 */
const props = defineProps<{ component: RepeaterSchema }>()
const formatter = useFormatter()
const context = useFieldActionContext(() => props.component)
const runItemAction = useRunItemAction(context)
const fallbacks = useItemActionFallbacks()
const resolve = (name: ItemActionName, index?: number) =>
  resolveItemAction(
    name,
    props.component,
    index === undefined ? undefined : props.component.items[index],
    name === 'add' ? { ...fallbacks.add, label: props.component.addActionLabel } : fallbacks[name],
  )
const {
  value,
  setValue,
  error,
  id,
  disabled: fieldDisabled,
  readOnly,
  aria,
} = useField<unknown[] | null>(() => props.component)
// Read-only shows the items but hides add, delete, clone and reorder controls.
const disabled = computed(() => fieldDisabled.value || readOnly.value)
const items = computed(() => value.value ?? [])
const collapsed = ref<Record<number, boolean>>({})
const dragIndex = ref<number | null>(null)
// Long lists render only the visible items (plus a few around them); a multi-column
// `grid()` is windowed by whole rows, counting its columns from the rendered grid.
const virtual = useVirtualList(
  () => items.value.length,
  () =>
    virtualizeOptions(
      props.component.virtualize,
      VIRTUAL_ESTIMATES.item,
      12,
      props.component.grid ? 'auto' : 1,
    ),
)
useScrollToErroredItem(virtual, () => props.component.statePath)

const schemaFor = (index: number): SchemaComponent[] =>
  props.component.items[index]?.schema ??
  replacePlaceholder(props.component.template, '__INDEX__', String(index))
const isCollapsed = (index: number) => collapsed.value[index] ?? props.component.collapsed ?? false

const canAdd = computed(
  () =>
    props.component.addable &&
    !disabled.value &&
    (props.component.maxItems == null || items.value.length < props.component.maxItems),
)
const canDelete = computed(
  () =>
    props.component.deletable &&
    !disabled.value &&
    (props.component.minItems == null || items.value.length > props.component.minItems),
)

// Collapsed flags are keyed by index, so they move with their item.
const moveItem = (from: number, to: number) => {
  setValue(moveRepeaterItem(items.value, from, to))
  collapsed.value = moveIndexedState(collapsed.value, from, to)
}
// Move buttons: announced, one at a time, focus kept on the moved item.
const moves = useItemMoves(
  value,
  (from, to) => moveItem(from, to),
  (index) => props.component.items[index]?.label,
  () => items.value.length,
)
const moveAnnouncement = moves.announcement
const moveContainer = moves.container
const removeItem = (index: number) => {
  setValue(removeRepeaterItem(items.value, index))
  collapsed.value = removeIndexedState(collapsed.value, index)
}
const cloneItem = (index: number) => {
  setValue(cloneRepeaterItem(items.value, index))
  collapsed.value = cloneIndexedState(collapsed.value, index)
}

const draggable = computed(
  () =>
    props.component.reorderable &&
    props.component.reorderableWithDragAndDrop !== false &&
    !disabled.value &&
    resolve('reorder') !== null,
)
const buttons = computed(
  () =>
    props.component.reorderable &&
    props.component.reorderableWithButtons !== false &&
    !disabled.value,
)
const setAllCollapsed = (value: boolean) => {
  collapsed.value = Object.fromEntries(items.value.map((_, index) => [index, value]))
}

// A drop runs the reorder action: in the browser, or on the server when customised.
const onDrop = (index: number) => {
  const from = dragIndex.value
  dragIndex.value = null
  if (from === null || from === index) return
  runItemAction(
    resolve('reorder'),
    { items: reorderedItemKeys(items.value.length, from, index) },
    () => moveItem(from, index),
  )
}

const add = () =>
  setValue(
    appendRepeaterItem(
      items.value,
      props.component.simple
        ? ({ [Object.keys(props.component.templateState)[0] ?? 'value']: null } as Record<
            string,
            unknown
          >)
        : props.component.templateState,
    ),
  )
</script>

<template>
  <!-- `deferLoading()`: a skeleton until the field scrolls into view. -->
  <DeferredSchema
    v-if="isDeferredPlaceholder(props.component)"
    v-slot="{ component: loaded }"
    :component="props.component"
  >
    <RepeaterField :component="loaded" />
  </DeferredSchema>
  <FieldWrapper v-else :field="props.component" :html-for="id" :error="error">
    <div ref="moveContainer" class="flex flex-col gap-3">
      <span aria-live="polite" aria-atomic="true" class="sr-only" data-slot="item-move-status">{{
        moveAnnouncement
      }}</span>
      <RepeaterTable
        v-if="props.component.table?.length && !props.component.simple"
        :id="id"
        :columns="props.component.table"
        :compact="props.component.compact"
        :count="items.length"
        :prefix-for="(index: number) => `${props.component.statePath}.${index}.`"
        :schema-for="schemaFor"
        :labelled-by="props.component.label ? fieldIds(id).label : undefined"
        :described-by="aria['aria-describedby']"
        :reorderable="buttons"
        :cloneable="Boolean(props.component.cloneable) && canAdd"
        :deletable="canDelete"
        :virtual="virtual"
        :context="context"
        :resolve="resolve"
        :extra-actions-for="(index: number) => props.component.items[index]?.actions"
        @move="moveItem"
        @clone="cloneItem"
        @remove="removeItem"
      />
      <CollapseAllActions
        v-if="
          !(props.component.table?.length && !props.component.simple) &&
          props.component.collapsible &&
          !props.component.simple &&
          items.length > 0
        "
        :context="context"
        :collapse-all="resolve('collapseAll')"
        :expand-all="resolve('expandAll')"
        @collapse-all="setAllCollapsed(true)"
        @expand-all="setAllCollapsed(false)"
      />
      <ul
        v-if="!(props.component.table?.length && !props.component.simple)"
        :id="id"
        :ref="virtual.attach"
        :aria-labelledby="props.component.label ? fieldIds(id).label : undefined"
        :aria-describedby="aria['aria-describedby']"
        :style="virtual.style.value"
        :class="cn('grid gap-3', props.component.grid && gridColumnsClasses(props.component.grid))"
      >
        <li
          v-for="index in virtual.indexes.value"
          :key="index"
          :ref="virtual.item"
          :data-index="index"
          :aria-setsize="virtual.range.value.active ? items.length : undefined"
          :aria-posinset="virtual.range.value.active ? index + 1 : undefined"
          :draggable="draggable"
          :class="
            cn(
              'bg-card min-w-0 rounded-lg border shadow-xs',
              dragIndex === index && 'opacity-50',
              props.component.simple && 'border-0 shadow-none',
            )
          "
          @dragstart="dragIndex = index"
          @dragover="draggable && $event.preventDefault()"
          @drop="onDrop(index)"
          @dragend="dragIndex = null"
        >
          <Collapsible :open="!isCollapsed(index)">
            <div
              v-if="!props.component.simple"
              class="flex flex-wrap items-center gap-1 border-b px-2 py-1.5"
              data-slot="item-header"
            >
              <span
                v-if="draggable"
                class="text-muted-foreground cursor-grab"
                :title="resolve('reorder')?.label ?? undefined"
                aria-hidden="true"
                ><Icon :name="resolve('reorder')?.icon ?? 'grip-vertical'"
              /></span>
              <span
                v-if="props.component.itemNumbers"
                class="text-muted-foreground text-xs tabular-nums"
                >{{ formatter.number(index + 1) }}</span
              >
              <span
                v-if="props.component.items[index]?.label"
                dir="auto"
                class="min-w-0 truncate text-sm font-medium"
                >{{ props.component.items[index]?.label }}</span
              >
              <span class="flex-1" />
              <ItemHeaderActions
                :context="context"
                :item-key="String(index)"
                :index="index"
                :count="items.length"
                :resolve="(name: ItemActionName) => resolve(name, index)"
                :extra-actions="disabled ? undefined : props.component.items[index]?.actions"
                :buttons="buttons"
                :can-clone="Boolean(props.component.cloneable) && canAdd"
                :can-delete="canDelete"
                :collapsible="Boolean(props.component.collapsible)"
                :collapsed="isCollapsed(index)"
                @move="moves.moveWithButton"
                @clone="cloneItem(index)"
                @delete="removeItem(index)"
                @toggle="collapsed = { ...collapsed, [index]: !isCollapsed(index) }"
              />
            </div>
            <CollapsibleContent>
              <div :class="cn('flex gap-2', props.component.simple ? 'items-start' : 'p-4')">
                <div class="flex-1">
                  <SchemaRenderer
                    :components="schemaFor(index)"
                    :columns="
                      props.component.simple
                        ? { default: 1 }
                        : (props.component.columns ?? { default: 1, lg: 2 })
                    "
                    :class="
                      cn(
                        props.component.simple && 'gap-0',
                        '[&_[data-slot=field]_[data-slot=label]]:hidden',
                        !props.component.simple && '[&_[data-slot=field]_[data-slot=label]]:flex',
                      )
                    "
                  />
                </div>
                <ItemActionButton
                  v-if="props.component.simple && canDelete"
                  :action="resolve('delete', index)"
                  :context="context"
                  :args="{ item: String(index) }"
                  size="default"
                  class="text-muted-foreground"
                  @client="removeItem(index)"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </li>
      </ul>
      <AddActionRow v-if="canAdd" :alignment="props.component.addActionAlignment">
        <ItemActionButton :action="resolve('add')" :context="context" size="sm" @client="add" />
      </AddActionRow>
    </div>
  </FieldWrapper>
</template>
