<script setup lang="ts">
import type { BuilderBlockSchema, BuilderItemState, BuilderSchema } from '@alfakit/core'
import {
  isDeferredPlaceholder,
  VIRTUAL_ESTIMATES,
  builderItemLabel,
  builderItems,
  builderItemSchema,
  canAddBuilderBlock,
  cloneIndexedState,
  cloneRepeaterItem,
  fieldIds,
  insertBuilderItem,
  itemActionContext,
  moveIndexedState,
  moveRepeaterItem,
  removeIndexedState,
  removeRepeaterItem,
  reorderedItemKeys,
  resolveItemAction,
  virtualizeOptions,
  type ActionSchema,
  type ItemActionName,
} from '@alfakit/core'
import { PencilIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useScrollToErroredItem, useVirtualList } from '../../composables/use-virtual-list'
import { useActionRunner, useFormatter, useOptionalRegistry, useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import DeferredSchema from '../layout/DeferredSchema.vue'
import { useField, useOptionalFormStore } from '../form/form-context'
import { useFieldActionContext } from '../schema/field-actions'
import FieldWrapper from '../schema/FieldWrapper.vue'
import SchemaRenderer from '../schema/SchemaRenderer.vue'
import Button from '../ui/Button.vue'
import Collapsible from '../ui/Collapsible.vue'
import CollapsibleContent from '../ui/CollapsibleContent.vue'
import AddActionRow from './AddActionRow.vue'
import CollapseAllActions from './CollapseAllActions.vue'
import ItemHeaderActions from './ItemHeaderActions.vue'
import { useItemActionFallbacks, useItemMoves, useRunItemAction } from './item-actions'
import BuilderBlockActionsMenu from './BuilderBlockActionsMenu.vue'
import BuilderBlockPicker from './BuilderBlockPicker.vue'
import BuilderBlockPickerPanel from './BuilderBlockPickerPanel.vue'

/**
 * A list of blocks, each with its own schema. Items use the server's per-item schema
 * when it describes the same block, else the block's template (fresh, moved or cloned
 * items the server has not seen yet).
 */
const props = defineProps<{ component: BuilderSchema }>()
const t = useT()
const formatter = useFormatter()
const registry = useOptionalRegistry()
const form = useOptionalFormStore()
const context = useFieldActionContext(() => props.component)
const runItemAction = useRunItemAction(context)
const fallbacks = useItemActionFallbacks('builder')
const serverItemOf = (index: number) => {
  const server = props.component.items[index]

  return server && server.type === items.value[index]?.type ? server : undefined
}
const resolve = (name: ItemActionName, index?: number) =>
  resolveItemAction(
    name,
    props.component,
    index === undefined ? undefined : serverItemOf(index),
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
} = useField<unknown>(() => props.component)
const locked = computed(() => fieldDisabled.value || readOnly.value)
const items = computed(() => builderItems(value.value))
const collapsed = ref<Record<number, boolean>>({})
const editing = ref<Record<number, boolean>>({})
const dragIndex = ref<number | null>(null)
// Long lists render only the visible blocks (plus a few around them).
const virtual = useVirtualList(
  () => items.value.length,
  () => virtualizeOptions(props.component.virtualize, VIRTUAL_ESTIMATES.item, 12),
)
useScrollToErroredItem(virtual, () => props.component.statePath)
const visibleItems = computed(() =>
  virtual.indexes.value.map((index) => ({ item: items.value[index] as BuilderItemState, index })),
)

const blockOf = (type: string) => props.component.blocks.find((block) => block.name === type)
const isCollapsed = (index: number) => collapsed.value[index] ?? props.component.collapsed ?? false
const canAdd = computed(
  () =>
    props.component.addable &&
    !locked.value &&
    (props.component.maxItems == null || items.value.length < props.component.maxItems),
)
const canDelete = computed(
  () =>
    props.component.deletable &&
    !locked.value &&
    (props.component.minItems == null || items.value.length > props.component.minItems),
)
const canClone = (item: BuilderItemState) => {
  const block = blockOf(item.type)

  return Boolean(
    props.component.cloneable &&
    canAdd.value &&
    block &&
    canAddBuilderBlock(props.component, block, items.value),
  )
}

const draggable = computed(
  () =>
    props.component.reorderable &&
    props.component.reorderableWithDragAndDrop !== false &&
    !locked.value &&
    resolve('reorder') !== null,
)
const buttons = computed(
  () =>
    props.component.reorderable &&
    props.component.reorderableWithButtons !== false &&
    !locked.value,
)
const addAction = computed(() => resolve('add'))
const showEmptyPicker = computed(
  () =>
    canAdd.value &&
    addAction.value !== null &&
    !addAction.value.disabled &&
    props.component.blocks.length > 0,
)
const menu = computed(() => Boolean(props.component.blockActionsMenu) && !locked.value)
const runner = useActionRunner()
// `blockActionsMenu()`: built-in actions run in the browser unless customised.
const onMenuAction = (name: ItemActionName, index: number) =>
  runItemAction(resolve(name, index), { item: String(index) }, () => {
    if (name === 'moveUp') moves.moveWithButton(index, index - 1)
    else if (name === 'moveDown') moves.moveWithButton(index, index + 1)
    else if (name === 'clone') cloneItem(index)
    else if (name === 'delete') removeItem(index)
  })
const onMenuExtra = (action: ActionSchema, index: number) =>
  void runner.trigger(action, itemActionContext(context.value, { item: String(index) }))

const update = (next: unknown[]) => setValue(next as BuilderItemState[])
const moveItem = (from: number, to: number) => {
  update(moveRepeaterItem(items.value, from, to))
  collapsed.value = moveIndexedState(collapsed.value, from, to)
  editing.value = moveIndexedState(editing.value, from, to)
}
// Move buttons: announced, one at a time, focus kept on the moved item.
const moves = useItemMoves(
  value,
  (from, to) => moveItem(from, to),
  (index) => builderItemLabel(props.component, items.value, index),
  () => items.value.length,
)
const moveAnnouncement = moves.announcement
const moveContainer = moves.container
const removeItem = (index: number) => {
  update(removeRepeaterItem(items.value, index))
  collapsed.value = removeIndexedState(collapsed.value, index)
  editing.value = removeIndexedState(editing.value, index)
}
const cloneItem = (index: number) => {
  update(cloneRepeaterItem(items.value, index))
  collapsed.value = cloneIndexedState(collapsed.value, index)
  editing.value = cloneIndexedState(editing.value, index)
}
const addBlock = (block: BuilderBlockSchema) =>
  runItemAction(addAction.value, { block: block.name }, () =>
    update(insertBuilderItem(items.value, block)),
  )
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
const setAllCollapsed = (value: boolean) => {
  collapsed.value = Object.fromEntries(items.value.map((_, index) => [index, value]))
  if (value) refreshSummaries(items.value.map((_, index) => index))
}
// Summaries are made on the server: collapsing items whose block has one brings them up
// to date with the edits.
const refreshSummaries = (indexes: number[]) => {
  if (indexes.some((index) => blockOf(items.value[index]?.type ?? '')?.summary)) {
    void form?.refresh(props.component.statePath)
  }
}
const toggleCollapsed = (index: number) => {
  const collapse = !isCollapsed(index)
  collapsed.value = { ...collapsed.value, [index]: collapse }
  if (collapse) refreshSummaries([index])
}

// Previews (`blockPreviews()`): server HTML or a registered `builder-preview:{name}`.
const previewComponentOf = (index: number) => {
  const name =
    serverItemOf(index)?.previewComponent ??
    blockOf(items.value[index]?.type ?? '')?.previewComponent

  return name ? registry?.resolve(`builder-preview:${name}`) : undefined
}
const hasPreview = (index: number) =>
  props.component.blockPreviews === true &&
  (previewComponentOf(index) !== undefined || Boolean(serverItemOf(index)?.preview))
const showPreview = (index: number) => hasPreview(index) && !editing.value[index]
// Closing the editor re-renders the previews from the server.
const toggleEditing = (index: number) => {
  const open = !editing.value[index]
  editing.value = { ...editing.value, [index]: open }
  if (!open) void form?.refresh(props.component.statePath)
}
const openEditor = (index: number) => {
  if (!locked.value) toggleEditing(index)
}
const previewIsButton = computed(() => !props.component.interactivePreviews && !locked.value)
</script>

<template>
  <!-- `deferLoading()`: a skeleton until the field scrolls into view. -->
  <DeferredSchema
    v-if="isDeferredPlaceholder(props.component)"
    v-slot="{ component: loaded }"
    :component="props.component"
  >
    <BuilderField :component="loaded" />
  </DeferredSchema>
  <FieldWrapper v-else :field="props.component" :html-for="id" :error="error">
    <div ref="moveContainer" class="flex flex-col gap-3" data-slot="builder">
      <span aria-live="polite" aria-atomic="true" class="sr-only" data-slot="item-move-status">{{
        moveAnnouncement
      }}</span>
      <!-- No blocks yet: the picker is right there instead of behind a button. -->
      <div
        v-if="items.length === 0 && showEmptyPicker"
        data-slot="builder-empty"
        class="bg-muted/30 flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:p-4"
      >
        <div class="px-1">
          <p class="text-sm font-medium">
            {{ t('builder.empty_heading', {}, 'Add your first block') }}
          </p>
          <p class="text-muted-foreground text-sm">
            {{
              t(
                'builder.empty_description',
                {},
                'Pick one to start. You can add more, reorder and remove them at any time.',
              )
            }}
          </p>
        </div>
        <BuilderBlockPickerPanel
          :component="props.component"
          :items="items"
          class="bg-card max-h-[28rem] rounded-md border"
          @pick="addBlock"
        />
      </div>
      <p
        v-else-if="items.length === 0"
        class="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm"
      >
        {{ t('builder.empty', {}, 'No blocks yet.') }}
      </p>
      <CollapseAllActions
        v-if="props.component.collapsible && items.length > 0"
        :context="context"
        :collapse-all="resolve('collapseAll')"
        :expand-all="resolve('expandAll')"
        @collapse-all="setAllCollapsed(true)"
        @expand-all="setAllCollapsed(false)"
      />
      <ul
        :id="id"
        :ref="virtual.attach"
        :aria-labelledby="props.component.label ? fieldIds(id).label : undefined"
        :aria-describedby="aria['aria-describedby']"
        :style="virtual.style.value"
        :class="cn('grid gap-3', items.length === 0 && 'hidden')"
      >
        <li
          v-for="{ item, index } in visibleItems"
          :key="index"
          :ref="virtual.item"
          :data-index="index"
          :aria-setsize="virtual.range.value.active ? items.length : undefined"
          :aria-posinset="virtual.range.value.active ? index + 1 : undefined"
          :data-block="item.type"
          :draggable="draggable"
          :class="
            cn('bg-card min-w-0 rounded-lg border shadow-xs', dragIndex === index && 'opacity-50')
          "
          @dragstart="dragIndex = index"
          @dragover="draggable && $event.preventDefault()"
          @drop="onDrop(index)"
          @dragend="dragIndex = null"
        >
          <Collapsible :open="!isCollapsed(index)">
            <div
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
              <Icon
                v-if="
                  props.component.blockIcons &&
                  (blockOf(item.type)?.icon ?? props.component.items[index]?.icon)
                "
                :name="blockOf(item.type)?.icon ?? props.component.items[index]?.icon"
                class="text-muted-foreground size-4"
              />
              <span
                v-if="props.component.blockNumbers"
                class="text-muted-foreground text-xs tabular-nums"
                >{{ formatter.number(index + 1) }}</span
              >
              <span class="flex min-w-0 flex-1 items-baseline gap-2">
                <span
                  v-if="props.component.blockLabels"
                  dir="auto"
                  class="min-w-0 shrink-0 truncate text-sm font-medium sm:max-w-[60%]"
                  >{{ builderItemLabel(props.component, items, index) }}</span
                >
                <span
                  v-if="serverItemOf(index)?.summary"
                  dir="auto"
                  class="text-muted-foreground min-w-0 truncate text-sm"
                  data-slot="builder-item-summary"
                  >{{ serverItemOf(index)?.summary }}</span
                >
              </span>
              <ItemHeaderActions
                :context="context"
                :item-key="String(index)"
                :index="index"
                :count="items.length"
                :resolve="(name: ItemActionName) => resolve(name, index)"
                :extra-actions="menu || locked ? undefined : serverItemOf(index)?.actions"
                :buttons="buttons && !menu"
                :can-clone="canClone(item) && !menu"
                :can-delete="canDelete && !menu"
                :collapsible="Boolean(props.component.collapsible)"
                :collapsed="isCollapsed(index)"
                @move="moves.moveWithButton"
                @clone="cloneItem(index)"
                @delete="removeItem(index)"
                @toggle="toggleCollapsed(index)"
              >
                <Button
                  v-if="hasPreview(index) && !locked"
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  :aria-label="t('builder.edit_block', {}, 'Edit block')"
                  :aria-pressed="Boolean(editing[index])"
                  @click="toggleEditing(index)"
                  ><Icon
                    name="alfakit::forms.components.builder.actions.edit"
                    :fallback="PencilIcon"
                /></Button>
                <BuilderBlockActionsMenu
                  v-if="menu"
                  :label="builderItemLabel(props.component, items, index) ?? ''"
                  :resolve="(name: ItemActionName) => resolve(name, index)"
                  :can-move-up="buttons && index > 0"
                  :can-move-down="buttons && index < items.length - 1"
                  :can-clone="canClone(item)"
                  :can-delete="canDelete"
                  :extra-actions="serverItemOf(index)?.actions"
                  @action="(name: ItemActionName) => onMenuAction(name, index)"
                  @extra="(action: ActionSchema) => onMenuExtra(action, index)"
                />
              </ItemHeaderActions>
            </div>
            <CollapsibleContent>
              <div
                v-if="showPreview(index)"
                data-slot="builder-preview"
                :class="cn('p-4', previewIsButton && 'cursor-pointer')"
                :role="previewIsButton ? 'button' : undefined"
                :tabindex="previewIsButton ? 0 : undefined"
                :aria-label="
                  previewIsButton ? t('builder.edit_block', {}, 'Edit block') : undefined
                "
                @click="previewIsButton && openEditor(index)"
                @keydown.enter.prevent="previewIsButton && openEditor(index)"
                @keydown.space.prevent="previewIsButton && openEditor(index)"
              >
                <div :class="cn(!props.component.interactivePreviews && 'pointer-events-none')">
                  <component
                    :is="previewComponentOf(index)"
                    v-if="previewComponentOf(index)"
                    :data="item.data"
                    :block="item.type"
                    :index="index"
                  />
                  <!-- Server-rendered `Block::preview()` HTML (Blade escapes the data). -->
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <div v-else v-html="serverItemOf(index)?.preview ?? ''" />
                </div>
              </div>
              <div v-else class="p-4">
                <SchemaRenderer
                  :components="builderItemSchema(props.component, items, index)"
                  :columns="
                    blockOf(item.type)?.columns ??
                    props.component.items[index]?.columns ?? { default: 1 }
                  "
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </li>
      </ul>
      <AddActionRow
        v-if="canAdd && addAction && props.component.blocks.length > 0 && items.length > 0"
        :alignment="props.component.addActionAlignment"
      >
        <BuilderBlockPicker :component="props.component" :items="items" @pick="addBlock">
          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="addAction?.disabled"
            data-slot="builder-add"
            ><Icon v-if="addAction?.icon" :name="addAction.icon" /> {{ addAction?.label }}</Button
          >
        </BuilderBlockPicker>
      </AddActionRow>
    </div>
  </FieldWrapper>
</template>
