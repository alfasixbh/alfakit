<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core'
import {
  PopoverContent,
  PopoverPortal,
  useDirection,
  useForwardPropsEmits,
  type PopoverContentEmits,
  type PopoverContentProps,
} from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = withDefaults(
  defineProps<PopoverContentProps & { class?: HTMLAttributes['class'] }>(),
  { align: 'center', sideOffset: 4 },
)
// The root is the portal, so extra attributes (data-slot, role, data-*) would be lost:
// forward them to the content element. `class` is a prop and is merged, never replaced.
defineOptions({ inheritAttrs: false })

const emits = defineEmits<PopoverContentEmits>()
const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class'), emits)
// Portaled outside Alfakit's root: carry the reading direction (starter kit pages and
// standalone components leave <html dir> to the host).
const dir = useDirection()
</script>

<template>
  <PopoverPortal>
    <PopoverContent
      data-slot="popover-content"
      v-bind="{ ...forwarded, dir: forwarded.dir ?? dir, ...$attrs }"
      :class="
        cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--reka-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden',
          props.class,
        )
      "
    >
      <slot />
    </PopoverContent>
  </PopoverPortal>
</template>
