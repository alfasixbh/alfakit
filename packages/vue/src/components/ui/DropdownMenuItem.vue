<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core'
import {
  DropdownMenuItem,
  useForwardPropsEmits,
  type DropdownMenuItemEmits,
  type DropdownMenuItemProps,
} from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = withDefaults(
  defineProps<
    DropdownMenuItemProps & {
      class?: HTMLAttributes['class']
      inset?: boolean
      variant?: 'default' | 'destructive'
    }
  >(),
  { variant: 'default' },
)
const emits = defineEmits<DropdownMenuItemEmits>()
const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class', 'inset', 'variant'), emits)
</script>

<template>
  <DropdownMenuItem
    v-bind="forwarded"
    data-slot="dropdown-menu-item"
    :data-inset="props.inset ? '' : undefined"
    :data-variant="props.variant"
    :class="
      cn(
        'focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*=\'text-\'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
        props.class,
      )
    "
  >
    <slot />
  </DropdownMenuItem>
</template>
