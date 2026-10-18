<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = withDefaults(
  defineProps<
    PrimitiveProps & { size?: 'sm' | 'md'; isActive?: boolean; class?: HTMLAttributes['class'] }
  >(),
  { as: 'a', size: 'md', isActive: false },
)
</script>

<template>
  <Primitive
    data-slot="sidebar-menu-sub-button"
    data-sidebar="menu-sub-button"
    :data-size="props.size"
    :data-active="props.isActive"
    :as="props.as"
    :as-child="props.asChild"
    :class="
      cn(
        'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 rtl:translate-x-px [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
        'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground',
        props.size === 'sm' && 'text-xs',
        props.size === 'md' && 'text-sm',
        'group-data-[collapsible=icon]:hidden',
        props.class,
      )
    "
  >
    <slot />
  </Primitive>
</template>
