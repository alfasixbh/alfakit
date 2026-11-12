<script setup lang="ts">
import type { NavigationGroupSchema } from '@alfakit/core'
import { hasActiveNavigationItem } from '@alfakit/core'
import { computed } from 'vue'
import { useDirection } from '../../context'
import { Icon } from '../../lib/icons'
import DropdownMenu from '../ui/DropdownMenu.vue'
import DropdownMenuContent from '../ui/DropdownMenuContent.vue'
import DropdownMenuLabel from '../ui/DropdownMenuLabel.vue'
import DropdownMenuTrigger from '../ui/DropdownMenuTrigger.vue'
import NavMenuItems from './NavMenuItems.vue'
import SidebarMenu from '../ui/SidebarMenu.vue'
import SidebarMenuButton from '../ui/SidebarMenuButton.vue'
import SidebarMenuItem from '../ui/SidebarMenuItem.vue'

/**
 * In the icon-only (collapsed) sidebar, a group with an icon is one button that opens its
 * items in a flyout menu, like Filament. Hidden while the sidebar is expanded.
 */
const props = defineProps<{ group: NavigationGroupSchema }>()
const direction = useDirection()
const active = computed(() => hasActiveNavigationItem(props.group.items))
</script>

<template>
  <SidebarMenu class="hidden group-data-[collapsible=icon]:flex" data-nav-flyout="">
    <SidebarMenuItem>
      <DropdownMenu :dir="direction">
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton :is-active="active">
            <Icon :name="props.group.icon!" />
            <span>{{ props.group.label }}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          :side="direction === 'rtl' ? 'left' : 'right'"
          align="start"
          class="min-w-56"
        >
          <DropdownMenuLabel>{{ props.group.label }}</DropdownMenuLabel>
          <NavMenuItems :items="props.group.items" />
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
