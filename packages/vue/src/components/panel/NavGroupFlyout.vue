<script setup lang="ts">
import NavLabel from './NavLabel.vue'
import type { NavigationGroupSchema } from '@alfakit/core'
import { flattenNavigationItems, hasActiveNavigationItem } from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import { computed } from 'vue'
import { useDirection } from '../../context'
import { badgeColorClasses, colorClass } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import NewTabHint from '../../lib/NewTabHint.vue'
import { cn } from '../../lib/utils'
import Badge from '../ui/Badge.vue'
import DropdownMenu from '../ui/DropdownMenu.vue'
import DropdownMenuContent from '../ui/DropdownMenuContent.vue'
import DropdownMenuItem from '../ui/DropdownMenuItem.vue'
import DropdownMenuLabel from '../ui/DropdownMenuLabel.vue'
import DropdownMenuTrigger from '../ui/DropdownMenuTrigger.vue'
import SidebarMenu from '../ui/SidebarMenu.vue'
import SidebarMenuButton from '../ui/SidebarMenuButton.vue'
import SidebarMenuItem from '../ui/SidebarMenuItem.vue'

/**
 * In the icon-only (collapsed) sidebar, a group with an icon is one button that opens its
 * items in a flyout menu, like Filament. Hidden while the sidebar is expanded.
 */
const props = defineProps<{ group: NavigationGroupSchema }>()
const direction = useDirection()
const items = computed(() => flattenNavigationItems(props.group.items))
const active = computed(() => hasActiveNavigationItem(props.group.items))
const itemClass = (depth: number) =>
  cn(
    'data-[active=true]:bg-accent data-[active=true]:font-medium',
    depth === 1 && 'ps-6',
    depth > 1 && 'ps-9',
  )
const badgeClass = (color: string | undefined) =>
  cn('ms-auto px-1.5 py-0', colorClass(badgeColorClasses, color, 'gray'))
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
          <DropdownMenuItem
            v-for="({ item, depth }, index) in items"
            :key="`${depth}-${item.label}-${index}`"
            as-child
            :data-active="item.active ? 'true' : undefined"
          >
            <a
              v-if="item.openInNewTab"
              v-bind="item.extraAttributes ?? {}"
              :href="item.url"
              target="_blank"
              rel="noopener noreferrer"
              :class="itemClass(depth)"
            >
              <Icon v-if="item.icon" :name="item.icon" />
              <NavLabel class="truncate" :text="item.label" :html="item.labelHtml" />
              <NewTabHint />
            </a>
            <Link
              v-else
              v-bind="item.extraAttributes ?? {}"
              :href="item.url ?? '#'"
              :aria-current="item.active ? 'page' : undefined"
              :class="itemClass(depth)"
            >
              <Icon v-if="item.icon" :name="item.icon" />
              <NavLabel class="truncate" :text="item.label" :html="item.labelHtml" />
              <Badge
                v-if="item.badge !== undefined && item.badge !== null"
                variant="outline"
                :class="badgeClass(item.badgeColor)"
                :title="item.badgeTooltip"
                >{{ item.badge }}</Badge
              >
              <span
                v-else-if="item.badgePending"
                data-slot="badge"
                aria-hidden="true"
                class="bg-muted-foreground/20 ms-auto inline-block h-4 w-5 animate-pulse rounded-md"
              />
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
