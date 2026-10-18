<script setup lang="ts">
import { moveListItem, reorderOffset } from '@alfakit/core'
import { GripVerticalIcon, XIcon } from '@lucide/vue'
import { nextTick, ref } from 'vue'
import { useDirection, useT } from '../../context'
import { cn } from '../../lib/utils'

/** The chosen options of a `reorderable()` multi-select, in order. */
const props = defineProps<{
  id: string
  values: Array<string | number>
  labelFor: (key: string) => string
  locked: boolean
  canRemove: boolean
  onChange: (values: Array<string | number>) => void
}>()

const t = useT()
const direction = useDirection()
const listRef = ref<HTMLElement | null>(null)
const dragIndex = ref<number | null>(null)
const announcement = ref('')

const move = (from: number, to: number) => {
  if (to < 0 || to >= props.values.length) {
    return
  }

  const label = props.labelFor(String(props.values[from]))
  const total = props.values.length
  props.onChange(moveListItem(props.values, from, to))
  announcement.value = t(
    'form.option_moved',
    { option: label, position: to + 1, total },
    ':option moved to position :position of :total',
  )
  void nextTick(() =>
    listRef.value?.querySelectorAll<HTMLElement>('[data-select-chip]')[to]?.focus(),
  )
}

const onKeyDown = (event: KeyboardEvent, index: number) => {
  const offset = reorderOffset(event, 'horizontal', direction.value)

  if (props.locked || offset === null) {
    return
  }

  event.preventDefault()
  move(index, index + offset)
}

const onDrop = (index: number) => {
  if (dragIndex.value !== null && dragIndex.value !== index) move(dragIndex.value, index)
  dragIndex.value = null
}

const onDragOver = (event: DragEvent) => {
  if (!props.locked) event.preventDefault()
}
</script>

<template>
  <template v-if="props.values.length > 0">
    <ul ref="listRef" data-slot="select-reorder-list" class="mt-2 flex flex-wrap gap-1.5">
      <li
        v-for="(item, index) in props.values"
        :key="String(item)"
        data-select-chip=""
        :tabindex="props.locked ? undefined : 0"
        :aria-describedby="props.locked ? undefined : `${props.id}-reorder-hint`"
        :draggable="!props.locked"
        :class="
          cn(
            'bg-secondary text-secondary-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium outline-none focus-visible:ring-[3px]',
            !props.locked && 'cursor-grab',
            dragIndex === index && 'opacity-50',
          )
        "
        @keydown="onKeyDown($event, index)"
        @dragstart="dragIndex = index"
        @dragover="onDragOver"
        @drop="onDrop(index)"
        @dragend="dragIndex = null"
      >
        <GripVerticalIcon
          v-if="!props.locked"
          aria-hidden="true"
          class="text-muted-foreground size-3"
        />
        <span>{{ props.labelFor(String(item)) }}</span>
        <button
          v-if="!props.locked && props.canRemove"
          type="button"
          :aria-label="t('form.remove_tag', { tag: props.labelFor(String(item)) }, 'Remove :tag')"
          class="hover:bg-foreground/10 rounded-sm"
          @click="props.onChange(props.values.filter((_, i) => i !== index))"
        >
          <XIcon class="size-3" />
        </button>
      </li>
    </ul>
    <span v-if="!props.locked" :id="`${props.id}-reorder-hint`" class="sr-only">{{
      t('form.reorder_options_hint', {}, 'Press Alt with an arrow key to move this option.')
    }}</span>
    <span aria-live="polite" aria-atomic="true" class="sr-only">{{ announcement }}</span>
  </template>
</template>
