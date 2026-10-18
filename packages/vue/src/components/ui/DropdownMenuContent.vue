<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core'
import {
  DropdownMenuContent,
  DropdownMenuPortal,
  useForwardPropsEmits,
  type DropdownMenuContentEmits,
  type DropdownMenuContentProps,
} from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = withDefaults(
  defineProps<DropdownMenuContentProps & { class?: HTMLAttributes['class'] }>(),
  { sideOffset: 4 },
)
// The root is the portal, so extra attributes (data-slot, role, data-*) would be lost:
// forward them to the content element. `class` is a prop and is merged, never replaced.
defineOptions({ inheritAttrs: false })

const emits = defineEmits<DropdownMenuContentEmits>()
const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class'), emits)
</script>

<template>
  <DropdownMenuPortal>
    <DropdownMenuContent
      data-slot="dropdown-menu-content"
      v-bind="{ ...forwarded, ...$attrs }"
      :class="
        cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--reka-dropdown-menu-content-available-height) min-w-[8rem] origin-(--reka-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md',
          props.class,
        )
      "
    >
      <slot />
    </DropdownMenuContent>
  </DropdownMenuPortal>
</template>
