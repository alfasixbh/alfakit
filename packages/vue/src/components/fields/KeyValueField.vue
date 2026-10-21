<script setup lang="ts">
import {
  fieldIds,
  moveRepeaterItem,
  reorderedItemKeys,
  resolveItemAction,
  type KeyValueSchema,
  itemActionIcon,
} from '@alfakit/core'
import { ChevronDownIcon, ChevronUpIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { useFieldActionContext } from '../schema/field-actions'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Button from '../ui/Button.vue'
import Input from '../ui/Input.vue'
import { useT } from '../../context'
import ItemActionButton from './ItemActionButton.vue'
import { useItemMoves, useRunItemAction } from './item-actions'

type Row = { key: string; value: string }

/**
 * The server stores an object; while editing we keep an ordered list of rows so keys
 * can be typed freely (including temporarily duplicate or empty keys).
 */
const props = defineProps<{ component: KeyValueSchema }>()
const { value, setValue, blur, error, id, disabled, readOnly, aria } = useField<
  Record<string, unknown> | Row[] | null
>(() => props.component)

const rows = computed<Row[]>(() => {
  if (Array.isArray(value.value)) {
    return value.value.map((row) => ({
      key: String(row.key ?? ''),
      value: row.value === null || row.value === undefined ? '' : String(row.value),
    }))
  }

  return Object.entries(value.value ?? {}).map(([key, rowValue]) => ({
    key,
    value: rowValue === null || rowValue === undefined ? '' : String(rowValue),
  }))
})

const update = (next: Row[]) => setValue(next)
const patch = (index: number, change: Partial<Row>) =>
  update(rows.value.map((item, i) => (i === index ? { ...item, ...change } : item)))
const t = useT()

const context = useFieldActionContext(() => props.component)
const runItemAction = useRunItemAction(context)
const addAction = computed(() =>
  resolveItemAction('add', props.component, undefined, {
    label: props.component.addActionLabel,
    icon: 'plus',
    variant: 'ghost',
  }),
)
const deleteAction = computed(() =>
  resolveItemAction('delete', props.component, undefined, {
    label: t('form.remove_row', {}, 'Remove row'),
    icon: itemActionIcon('key-value', 'delete', 'trash-2'),
  }),
)
const reorderAction = computed(() =>
  resolveItemAction('reorder', props.component, undefined, {
    label: t('form.reorder_item', {}, 'Reorder'),
    icon: itemActionIcon('key-value', 'reorder', 'grip-vertical'),
  }),
)
const deletable = computed(
  () => props.component.deletable && !readOnly.value && deleteAction.value !== null,
)
const reorderable = computed(
  () =>
    props.component.reorderable &&
    !readOnly.value &&
    !disabled.value &&
    reorderAction.value !== null,
)
const dragIndex = ref<number | null>(null)
// Moving runs the reorder action: in the browser, or on the server when customised.
const move = (from: number, to: number) =>
  runItemAction(
    reorderAction.value,
    { items: reorderedItemKeys(rows.value.length, from, to) },
    () => update(moveRepeaterItem(rows.value, from, to) as Row[]),
  )
// Move buttons: announced, one at a time, focus kept on the moved row.
const moves = useItemMoves(
  value,
  move,
  (index) => rows.value[index]?.key || null,
  () => rows.value.length,
)
const moveAnnouncement = moves.announcement
const moveContainer = moves.container
const onRowDrop = (index: number) => {
  if (dragIndex.value !== null && dragIndex.value !== index) move(dragIndex.value, index)
  dragIndex.value = null
}
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <div ref="moveContainer" class="overflow-hidden rounded-md border">
      <span aria-live="polite" aria-atomic="true" class="sr-only" data-slot="item-move-status">{{
        moveAnnouncement
      }}</span>
      <table
        class="w-full text-sm"
        :aria-labelledby="props.component.label ? fieldIds(id).label : undefined"
        :aria-describedby="aria['aria-describedby']"
      >
        <thead class="bg-muted/50 text-muted-foreground text-xs">
          <tr>
            <th v-if="reorderable" class="w-16" />
            <th class="px-3 py-2 text-start font-medium">{{ props.component.keyLabel }}</th>
            <th class="px-3 py-2 text-start font-medium">{{ props.component.valueLabel }}</th>
            <th v-if="deletable" class="w-10" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in rows"
            :key="index"
            :data-index="index"
            :draggable="reorderable"
            :class="cn('border-t', dragIndex === index && 'opacity-50')"
            @dragstart="dragIndex = index"
            @dragover="reorderable && $event.preventDefault()"
            @drop="onRowDrop(index)"
            @dragend="dragIndex = null"
          >
            <td v-if="reorderable" class="p-1.5">
              <div class="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  :aria-label="t('form.move_up', {}, 'Move up')"
                  :disabled="index === 0"
                  data-item-move="up"
                  @click="moves.moveWithButton(index, index - 1)"
                  ><ChevronUpIcon
                /></Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  :aria-label="t('form.move_down', {}, 'Move down')"
                  :disabled="index === rows.length - 1"
                  data-item-move="down"
                  @click="moves.moveWithButton(index, index + 1)"
                  ><ChevronDownIcon
                /></Button>
              </div>
            </td>
            <td class="p-1.5">
              <Input
                dir="auto"
                :model-value="row.key"
                :readonly="readOnly || !props.component.editableKeys"
                :disabled="disabled"
                :placeholder="props.component.keyPlaceholder"
                :aria-label="props.component.keyLabel"
                :aria-invalid="aria['aria-invalid']"
                class="h-8"
                @update:model-value="patch(index, { key: $event })"
                @blur="blur"
              />
            </td>
            <td class="p-1.5">
              <Input
                dir="auto"
                :model-value="row.value"
                :readonly="readOnly || !props.component.editableValues"
                :disabled="disabled"
                :placeholder="props.component.valuePlaceholder"
                :aria-label="props.component.valueLabel"
                :aria-invalid="aria['aria-invalid']"
                class="h-8"
                @update:model-value="patch(index, { value: $event })"
                @blur="blur"
              />
            </td>
            <td v-if="deletable" class="p-1.5">
              <ItemActionButton
                :action="deleteAction"
                :context="context"
                :args="{ item: String(index) }"
                size="sm"
                :disabled="disabled"
                class="text-muted-foreground"
                @client="update(rows.filter((_, i) => i !== index))"
              />
            </td>
          </tr>
          <tr v-if="rows.length === 0" class="border-t">
            <td
              :colspan="reorderable ? 4 : 3"
              class="text-muted-foreground px-3 py-4 text-center text-xs"
            >
              —
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="props.component.addable && !readOnly && addAction" class="border-t p-1.5">
        <ItemActionButton
          :action="addAction"
          :context="context"
          size="sm"
          :disabled="disabled"
          @client="update([...rows, { key: '', value: '' }])"
        />
      </div>
    </div>
  </FieldWrapper>
</template>
