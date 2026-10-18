<script setup lang="ts">
import { CircleIcon } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import {
  DropdownMenuItemIndicator,
  DropdownMenuRadioItem,
  useForwardPropsEmits,
  type DropdownMenuRadioItemEmits,
  type DropdownMenuRadioItemProps,
} from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = defineProps<DropdownMenuRadioItemProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<DropdownMenuRadioItemEmits>()
const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class'), emits)
</script>

<template>
  <DropdownMenuRadioItem
    v-bind="forwarded"
    data-slot="dropdown-menu-radio-item"
    :class="
      cn(
        'focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 ps-8 pe-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
        props.class,
      )
    "
  >
    <span class="pointer-events-none absolute start-2 flex size-3.5 items-center justify-center">
      <DropdownMenuItemIndicator>
        <CircleIcon class="size-2 fill-current" />
      </DropdownMenuItemIndicator>
    </span>
    <slot />
  </DropdownMenuRadioItem>
</template>
