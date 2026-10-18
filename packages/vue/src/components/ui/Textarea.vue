<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class']; modelValue?: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

defineOptions({ inheritAttrs: false })
</script>

<template>
  <textarea
    v-bind="$attrs"
    data-slot="textarea"
    :value="props.modelValue ?? ''"
    :class="
      cn(
        'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        props.class,
      )
    "
    @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
