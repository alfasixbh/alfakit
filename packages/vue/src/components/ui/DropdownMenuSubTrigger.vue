<script setup lang="ts">
import { ChevronRightIcon } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import { DropdownMenuSubTrigger, useForwardProps, type DropdownMenuSubTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = defineProps<
  DropdownMenuSubTriggerProps & { class?: HTMLAttributes['class']; inset?: boolean }
>()
const forwarded = useForwardProps(reactiveOmit(props, 'class', 'inset'))
</script>

<template>
  <DropdownMenuSubTrigger
    v-bind="forwarded"
    data-slot="dropdown-menu-sub-trigger"
    :data-inset="props.inset ? '' : undefined"
    :class="
      cn(
        'focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
        props.class,
      )
    "
  >
    <slot />
    <ChevronRightIcon class="ms-auto size-4 rtl:rotate-180" />
  </DropdownMenuSubTrigger>
</template>
