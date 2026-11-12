<script setup lang="ts">
import type { NavigationItemSchema } from '@alfakit/core'
import { PREFETCH_CACHE_FOR, flattenNavigationItems } from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import { computed } from 'vue'
import { Icon } from '../../lib/icons'
import NewTabHint from '../../lib/NewTabHint.vue'
import { cn } from '../../lib/utils'
import DropdownMenuItem from '../ui/DropdownMenuItem.vue'
import DropdownMenuLabel from '../ui/DropdownMenuLabel.vue'
import NavBadge from './NavBadge.vue'
import NavLabel from './NavLabel.vue'

/**
 * Navigation items in a dropdown menu (a sidebar group's flyout, a top-navigation menu),
 * children indented under their parent at any depth. A parent without a URL is a heading.
 */
const props = defineProps<{ items: NavigationItemSchema[] }>()
const entries = computed(() => flattenNavigationItems(props.items))
const indent = (depth: number) => cn(depth === 1 && 'ps-6', depth > 1 && 'ps-9')
const itemClass = (depth: number) =>
  cn('data-[active=true]:bg-accent data-[active=true]:font-medium', indent(depth))
</script>

<template>
  <template v-for="({ item, depth }, index) in entries" :key="`${depth}-${item.label}-${index}`">
    <DropdownMenuItem v-if="item.url" as-child :data-active="item.active ? 'true' : undefined">
      <a
        v-if="item.openInNewTab"
        v-bind="item.extraAttributes ?? {}"
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
        :aria-current="item.active ? 'page' : undefined"
        :class="itemClass(depth)"
      >
        <Icon v-if="item.icon" :name="item.icon" />
        <NavLabel class="truncate" :text="item.label" :html="item.labelHtml" />
        <NavBadge :item="item" />
        <NewTabHint />
      </a>
      <Link
        v-else
        v-bind="item.extraAttributes ?? {}"
        :href="item.url"
        prefetch
        :cache-for="PREFETCH_CACHE_FOR"
        :aria-current="item.active ? 'page' : undefined"
        :class="itemClass(depth)"
      >
        <Icon v-if="item.icon" :name="item.icon" />
        <NavLabel class="truncate" :text="item.label" :html="item.labelHtml" />
        <NavBadge :item="item" />
      </Link>
    </DropdownMenuItem>
    <DropdownMenuLabel v-else :class="cn('flex items-center gap-2 [&_svg]:size-4', indent(depth))">
      <Icon v-if="item.icon" :name="item.icon" />
      <NavLabel class="truncate" :text="item.label" :html="item.labelHtml" />
    </DropdownMenuLabel>
  </template>
</template>
