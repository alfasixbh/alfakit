<script setup lang="ts">
import { moveListItem, reorderOffset, type TagsInputSchema } from '@alfakit/core'
import { XIcon } from '@lucide/vue'
import { computed, nextTick, ref } from 'vue'
import { useDirection, useT } from '../../context'
import { badgeColorClasses, colorClass } from '../../lib/colors'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Badge from '../ui/Badge.vue'

const props = defineProps<{ component: TagsInputSchema }>()
const t = useT()
const { value, setValue, blur, error, id, disabled, readOnly, aria } = useField<string[] | null>(
  () => props.component,
)
const direction = useDirection()
const draft = ref('')
const listRef = ref<HTMLElement | null>(null)
// Live-region text announced after a keyboard move.
const announcement = ref('')
const dragIndex = ref<number | null>(null)
const reorderable = computed(
  () => Boolean(props.component.reorderable) && !disabled.value && !readOnly.value,
)

const onTagDrop = (index: number) => {
  if (dragIndex.value !== null && dragIndex.value !== index)
    setValue(moveListItem(tags.value, dragIndex.value, index))
  dragIndex.value = null
}

// Alt + ArrowLeft/ArrowRight (flipped in RTL) moves the focused tag.
const onTagKeyDown = (event: KeyboardEvent, index: number) => {
  const offset = reorderOffset(event, 'horizontal', direction.value)

  if (!reorderable.value || offset === null) {
    return
  }

  event.preventDefault()
  const target = index + offset

  if (target < 0 || target >= tags.value.length) {
    return
  }

  const tag = tags.value[index] ?? ''
  setValue(moveListItem(tags.value, index, target))
  announcement.value = t(
    'form.tag_moved',
    { tag, position: target + 1, total: tags.value.length },
    ':tag moved to position :position of :total',
  )
  void nextTick(() => listRef.value?.querySelectorAll<HTMLElement>('[data-tag]')[target]?.focus())
}
const tags = computed(() => value.value ?? [])
const listId = computed(() => (props.component.suggestions ? `${id}-suggestions` : undefined))

const commit = (raw: string) => {
  const tag = `${props.component.tagPrefix ?? ''}${raw.trim()}${props.component.tagSuffix ?? ''}`

  if (raw.trim() === '' || tags.value.includes(tag)) {
    draft.value = ''

    return
  }

  setValue([...tags.value, tag])
  draft.value = ''
}

const onKeyDown = (event: KeyboardEvent) => {
  if (readOnly.value) {
    return
  }

  if (props.component.splitKeys.includes(event.key)) {
    event.preventDefault()
    commit(draft.value)
  } else if (event.key === 'Backspace' && draft.value === '' && tags.value.length > 0) {
    setValue(tags.value.slice(0, -1))
  }
}

const onBlur = () => {
  if (!readOnly.value && draft.value.trim() !== '') {
    commit(draft.value)
  }

  blur()
}
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <div
      ref="listRef"
      :class="
        cn(
          'border-input dark:bg-input/30 has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-ring/50 flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 shadow-xs has-[input:focus-visible]:ring-[3px]',
          error && 'border-destructive',
          disabled && 'opacity-50',
        )
      "
    >
      <Badge
        v-for="(tag, index) in tags"
        :key="`${tag}-${index}`"
        variant="outline"
        data-tag=""
        :tabindex="reorderable ? 0 : undefined"
        :aria-describedby="reorderable ? `${id}-reorder-hint` : undefined"
        :draggable="reorderable"
        :class="
          cn(
            'gap-1 pe-1',
            colorClass(badgeColorClasses, props.component.color, 'gray'),
            reorderable &&
              'focus-visible:ring-ring/50 cursor-grab outline-none focus-visible:ring-[3px]',
            dragIndex === index && 'opacity-50',
          )
        "
        @dragstart="dragIndex = index"
        @dragover="reorderable && $event.preventDefault()"
        @drop="onTagDrop(index)"
        @dragend="dragIndex = null"
        @keydown="onTagKeyDown($event, index)"
      >
        {{ tag }}
        <button
          v-if="!disabled && !readOnly"
          type="button"
          :aria-label="t('form.remove_tag', { tag }, 'Remove :tag')"
          class="hover:bg-foreground/10 rounded-sm"
          @click="setValue(tags.filter((_, i) => i !== index))"
        >
          <XIcon class="size-3" />
        </button>
      </Badge>
      <input
        :id="id"
        v-model="draft"
        dir="auto"
        :list="listId"
        :placeholder="
          tags.length === 0 ? (props.component.placeholder ?? t('form.add_item', {}, 'Add…')) : ''
        "
        :disabled="disabled"
        :readonly="readOnly"
        :aria-invalid="aria['aria-invalid']"
        :aria-describedby="aria['aria-describedby']"
        :aria-required="aria['aria-required']"
        class="placeholder:text-muted-foreground min-w-[6rem] flex-1 bg-transparent text-sm outline-none"
        @keydown="onKeyDown"
        @blur="onBlur"
      />
      <datalist v-if="props.component.suggestions" :id="listId">
        <option
          v-for="suggestion in props.component.suggestions"
          :key="suggestion"
          :value="suggestion"
        />
      </datalist>
      <span v-if="reorderable" :id="`${id}-reorder-hint`" class="sr-only">{{
        t('form.reorder_tags_hint', {}, 'Press Alt with an arrow key to move this tag.')
      }}</span>
      <span aria-live="polite" aria-atomic="true" class="sr-only">{{ announcement }}</span>
    </div>
  </FieldWrapper>
</template>
