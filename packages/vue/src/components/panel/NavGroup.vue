<script setup lang="ts">
import { useOpenWhenActive } from '../../composables/use-persistent-layout'
import type { NavigationGroupSchema } from '@alfakit/core'
import { ChevronRightIcon } from '@lucide/vue'
import { Icon } from '../../lib/icons'
import Collapsible from '../ui/Collapsible.vue'
import CollapsibleContent from '../ui/CollapsibleContent.vue'
import CollapsibleTrigger from '../ui/CollapsibleTrigger.vue'
import SidebarGroup from '../ui/SidebarGroup.vue'
import SidebarGroupContent from '../ui/SidebarGroupContent.vue'
import SidebarGroupLabel from '../ui/SidebarGroupLabel.vue'
import SidebarMenu from '../ui/SidebarMenu.vue'
import { cn } from '../../lib/utils'
import NavGroupFlyout from './NavGroupFlyout.vue'
import NavItem from './NavItem.vue'

const props = defineProps<{ group: NavigationGroupSchema }>()
// Keeps what the user opened across visits; opens again when one of its items becomes active.
const active = () => props.group.items.some((item) => item.active)
const open = useOpenWhenActive(() => !props.group.collapsed || active(), active)
// `NavigationGroup::extraSidebarAttributes()`; Vue merges `class` with the group's own.
const attributes = () => props.group.extraSidebarAttributes ?? {}
// A labelled group with an icon collapses into a flyout in the icon-only sidebar.
const flyout = () => Boolean(props.group.label && props.group.icon)
const contentClass = () => cn(flyout() && 'group-data-[collapsible=icon]:hidden')
</script>

<template>
  <SidebarGroup v-if="!props.group.label" v-bind="attributes()">
    <SidebarGroupContent>
      <SidebarMenu>
        <NavItem v-for="item in props.group.items" :key="item.url ?? item.label" :item="item" />
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
  <SidebarGroup v-else-if="!props.group.collapsible" v-bind="attributes()">
    <SidebarGroupLabel>
      <Icon v-if="props.group.icon" :name="props.group.icon" class="me-1.5" />
      {{ props.group.label }}
    </SidebarGroupLabel>
    <SidebarGroupContent :class="contentClass()">
      <SidebarMenu>
        <NavItem v-for="item in props.group.items" :key="item.url ?? item.label" :item="item" />
      </SidebarMenu>
    </SidebarGroupContent>
    <NavGroupFlyout v-if="flyout()" :group="props.group" />
  </SidebarGroup>
  <Collapsible v-else v-model:open="open" class="group/nav-group">
    <SidebarGroup v-bind="attributes()">
      <CollapsibleTrigger as-child>
        <SidebarGroupLabel
          as="button"
          type="button"
          class="hover:bg-sidebar-accent w-full cursor-pointer justify-between"
        >
          <span class="flex items-center gap-1.5">
            <Icon v-if="props.group.icon" :name="props.group.icon" />
            {{ props.group.label }}
          </span>
          <Icon
            name="alfakit::panels.sidebar.group.collapse-button"
            :fallback="ChevronRightIcon"
            class="size-3.5 transition-transform group-data-[state=open]/nav-group:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/nav-group:rotate-90"
          />
        </SidebarGroupLabel>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarGroupContent :class="contentClass()">
          <SidebarMenu>
            <NavItem v-for="item in props.group.items" :key="item.url ?? item.label" :item="item" />
          </SidebarMenu>
        </SidebarGroupContent>
      </CollapsibleContent>
      <NavGroupFlyout v-if="flyout()" :group="props.group" />
    </SidebarGroup>
  </Collapsible>
</template>
