<script setup lang="ts">
import {
  stickyCollisionPadding,
  type BuilderBlockSchema,
  type BuilderItemState,
  type BuilderSchema,
} from '@alfakit/core'
import { computed, ref } from 'vue'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import Popover from '../ui/Popover.vue'
import PopoverContent from '../ui/PopoverContent.vue'
import PopoverTrigger from '../ui/PopoverTrigger.vue'
import BuilderBlockPickerPanel from './BuilderBlockPickerPanel.vue'

/**
 * The "Add block" button (the default slot) and its picker, anchored below the button
 * (above it when there is no room) and never wider or taller than the screen.
 */
const props = defineProps<{ component: BuilderSchema; items: BuilderItemState[] }>()
const emit = defineEmits<{ pick: [block: BuilderBlockSchema] }>()
const t = useT()
const open = ref(false)
// Opening upwards near the top of the page, stay below the sticky topbar.
const collisionPadding = computed(() => (open.value ? stickyCollisionPadding() : 16))

/** `blockPickerWidth()`: spelled out so Tailwind generates them. */
const PICKER_WIDTHS: Record<string, string> = {
  '3xs': 'w-3xs',
  '2xs': 'w-2xs',
  xs: 'w-xs',
  sm: 'w-sm',
  md: 'w-md',
  lg: 'w-lg',
  xl: 'w-xl',
  '2xl': 'w-2xl',
  '3xl': 'w-3xl',
  '4xl': 'w-4xl',
  '5xl': 'w-5xl',
  '6xl': 'w-6xl',
  '7xl': 'w-7xl',
  none: 'w-auto',
  min: 'w-min',
  max: 'w-max',
  fit: 'w-fit',
  prose: 'w-[65ch]',
  container: 'container',
  'screen-sm': 'w-(--breakpoint-sm)',
  'screen-md': 'w-(--breakpoint-md)',
  'screen-lg': 'w-(--breakpoint-lg)',
  'screen-xl': 'w-(--breakpoint-xl)',
  'screen-2xl': 'w-(--breakpoint-2xl)',
  full: 'w-(--reka-popover-trigger-width)',
  screen: 'w-screen',
}

const width = computed(() => {
  if (props.component.blockPickerWidth) {
    return cn(PICKER_WIDTHS[props.component.blockPickerWidth], 'max-w-[calc(100vw-2rem)]')
  }

  const columns = Object.values(props.component.blockPickerColumns ?? {}).some(
    (value) => (value ?? 1) > 1,
  )

  return columns ? 'w-[min(42rem,calc(100vw-2rem))]' : 'w-[min(22rem,calc(100vw-2rem))]'
})

const pick = (block: BuilderBlockSchema) => {
  open.value = false
  emit('pick', block)
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <slot />
    </PopoverTrigger>
    <PopoverContent
      align="start"
      side="bottom"
      :collision-padding="collisionPadding"
      :aria-label="t('builder.pick_block', {}, 'Choose a block')"
      :class="
        cn(
          'flex max-h-[min(34rem,var(--reka-popover-content-available-height))] flex-col overflow-hidden p-0',
          width,
        )
      "
    >
      <BuilderBlockPickerPanel
        v-if="open"
        :component="props.component"
        :items="props.items"
        auto-focus
        @pick="pick"
      />
    </PopoverContent>
  </Popover>
</template>
