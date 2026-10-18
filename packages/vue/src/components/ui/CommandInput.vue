<script setup lang="ts">
import { SearchIcon } from '@lucide/vue'
import { ListboxFilter } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  modelValue?: string
  placeholder?: string
  autoFocus?: boolean
}>()
const emits = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div data-slot="command-input-wrapper" class="flex h-9 items-center gap-2 border-b px-3">
    <SearchIcon class="size-4 shrink-0 opacity-50" />
    <ListboxFilter
      data-slot="command-input"
      :model-value="props.modelValue"
      :placeholder="props.placeholder"
      :auto-focus="props.autoFocus"
      :class="
        cn(
          'placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
          props.class,
        )
      "
      @update:model-value="emits('update:modelValue', String($event ?? ''))"
    />
  </div>
</template>
