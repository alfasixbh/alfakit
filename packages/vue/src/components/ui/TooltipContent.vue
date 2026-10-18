<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core'
import {
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
  useForwardPropsEmits,
  type TooltipContentEmits,
  type TooltipContentProps,
} from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = withDefaults(
  defineProps<TooltipContentProps & { class?: HTMLAttributes['class'] }>(),
  { sideOffset: 4 },
)
// The root is the portal, so extra attributes (data-slot, role, data-*) would be lost:
// forward them to the content element. `class` is a prop and is merged, never replaced.
defineOptions({ inheritAttrs: false })

const emits = defineEmits<TooltipContentEmits>()
const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class'), emits)
</script>

<template>
  <TooltipPortal>
    <TooltipContent
      data-slot="tooltip-content"
      v-bind="{ ...forwarded, ...$attrs }"
      :class="
        cn(
          'bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--reka-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance',
          props.class,
        )
      "
    >
      <slot />
      <TooltipArrow
        class="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]"
      />
    </TooltipContent>
  </TooltipPortal>
</template>
