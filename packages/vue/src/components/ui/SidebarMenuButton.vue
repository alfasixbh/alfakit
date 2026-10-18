<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'
import { sidebarMenuButtonVariants, type SidebarMenuButtonVariants } from './sidebar-menu-button'
import Tooltip from './Tooltip.vue'
import TooltipContent from './TooltipContent.vue'
import TooltipTrigger from './TooltipTrigger.vue'
import { useSidebar } from './use-sidebar'

const props = withDefaults(
  defineProps<
    PrimitiveProps & {
      isActive?: boolean
      variant?: SidebarMenuButtonVariants['variant']
      size?: SidebarMenuButtonVariants['size']
      tooltip?: string
      class?: HTMLAttributes['class']
    }
  >(),
  { as: 'button', isActive: false, variant: 'default', size: 'default' },
)
const { isMobile, state } = useSidebar()
</script>

<template>
  <Tooltip v-if="props.tooltip">
    <TooltipTrigger as-child>
      <Primitive
        data-slot="sidebar-menu-button"
        data-sidebar="menu-button"
        :data-size="props.size"
        :data-active="props.isActive"
        :as="props.as"
        :as-child="props.asChild"
        :class="
          cn(sidebarMenuButtonVariants({ variant: props.variant, size: props.size }), props.class)
        "
      >
        <slot />
      </Primitive>
    </TooltipTrigger>
    <TooltipContent side="right" align="center" :hidden="state !== 'collapsed' || isMobile">{{
      props.tooltip
    }}</TooltipContent>
  </Tooltip>
  <Primitive
    v-else
    data-slot="sidebar-menu-button"
    data-sidebar="menu-button"
    :data-size="props.size"
    :data-active="props.isActive"
    :as="props.as"
    :as-child="props.asChild"
    :class="
      cn(sidebarMenuButtonVariants({ variant: props.variant, size: props.size }), props.class)
    "
  >
    <slot />
  </Primitive>
</template>
