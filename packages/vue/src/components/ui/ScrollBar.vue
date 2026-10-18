<script setup lang="ts">
import { ScrollAreaScrollbar, ScrollAreaThumb, type ScrollAreaScrollbarProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = withDefaults(
  defineProps<ScrollAreaScrollbarProps & { class?: HTMLAttributes['class'] }>(),
  { orientation: 'vertical' },
)
</script>

<template>
  <ScrollAreaScrollbar
    data-slot="scroll-area-scrollbar"
    :orientation="props.orientation"
    :class="
      cn(
        'flex touch-none p-px transition-colors select-none',
        props.orientation === 'vertical' && 'h-full w-2.5 border-s border-s-transparent',
        props.orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
        props.class,
      )
    "
  >
    <ScrollAreaThumb data-slot="scroll-area-thumb" class="bg-border relative flex-1 rounded-full" />
  </ScrollAreaScrollbar>
</template>
