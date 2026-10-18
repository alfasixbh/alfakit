<script setup lang="ts">
import { ChevronDownIcon, ChevronUpIcon } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import {
  SelectContent,
  SelectPortal,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectViewport,
  useForwardPropsEmits,
  type SelectContentEmits,
  type SelectContentProps,
} from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = withDefaults(
  defineProps<SelectContentProps & { class?: HTMLAttributes['class'] }>(),
  { position: 'popper' },
)
// The root is the portal, so extra attributes (data-slot, role, data-*) would be lost:
// forward them to the content element. `class` is a prop and is merged, never replaced.
defineOptions({ inheritAttrs: false })

const emits = defineEmits<SelectContentEmits>()
const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class'), emits)
</script>

<template>
  <SelectPortal>
    <SelectContent
      data-slot="select-content"
      v-bind="{ ...forwarded, ...$attrs }"
      :class="
        cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--reka-select-content-available-height) min-w-[8rem] origin-(--reka-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md',
          props.position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          props.class,
        )
      "
    >
      <SelectScrollUpButton
        data-slot="select-scroll-up-button"
        class="flex cursor-default items-center justify-center py-1"
      >
        <ChevronUpIcon class="size-4" />
      </SelectScrollUpButton>
      <SelectViewport
        :class="
          cn(
            'p-1',
            props.position === 'popper' &&
              'h-[var(--reka-select-trigger-height)] w-full min-w-[var(--reka-select-trigger-width)] scroll-my-1',
          )
        "
      >
        <slot />
      </SelectViewport>
      <SelectScrollDownButton
        data-slot="select-scroll-down-button"
        class="flex cursor-default items-center justify-center py-1"
      >
        <ChevronDownIcon class="size-4" />
      </SelectScrollDownButton>
    </SelectContent>
  </SelectPortal>
</template>
