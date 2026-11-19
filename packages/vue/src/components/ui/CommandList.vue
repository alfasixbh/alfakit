<script setup lang="ts">
import { ListboxContent } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  id?: string
  /** The accessible name of the listbox. */
  label?: string
}>()
</script>

<template>
  <ListboxContent
    :id="props.id"
    data-slot="command-list"
    :aria-label="props.label"
    :class="cn('max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto', props.class)"
  >
    <slot />
  </ListboxContent>
</template>
