<script setup lang="ts">
import type { NavigationItemSchema } from '@alfakit/core'
import { PREFETCH_CACHE_FOR, flattenNavigationItems } from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import { computed } from 'vue'
import { Icon } from '../../lib/icons'
import NewTabHint from '../../lib/NewTabHint.vue'
import { cn } from '../../lib/utils'
import NavBadge from './NavBadge.vue'
import NavLabel from './NavLabel.vue'

/**
 * Navigation items as a vertical list for a sheet (the top-navigation drawer, the bottom
 * bar's "More" sheet): new-tab links, badges and children at any depth, like the sidebar.
 */
const props = defineProps<{ items: NavigationItemSchema[]; itemClass?: string }>()
const emit = defineEmits<{ navigate: [] }>()
const entries = computed(() => flattenNavigationItems(props.items))
const indent = (depth: number) => cn(depth === 1 && 'ps-6', depth > 1 && 'ps-9')
const linkClass = (depth: number) =>
  cn(
    'hover:bg-accent data-[active=true]:bg-accent flex items-center gap-2 rounded-md px-2 py-2 font-medium [&_svg]:size-4',
    props.itemClass,
    indent(depth),
  )
</script>

<template>
  <template v-for="({ item, depth }, index) in entries" :key="`${depth}-${item.label}-${index}`">
    <a
      v-if="item.url && item.openInNewTab"
      v-bind="item.extraAttributes ?? {}"
      :href="item.url"
      target="_blank"
      rel="noopener noreferrer"
      :data-active="item.active ? 'true' : undefined"
      :aria-current="item.active ? 'page' : undefined"
      :class="linkClass(depth)"
      @click="emit('navigate')"
    >
      <Icon v-if="item.icon" :name="item.icon" />
      <NavLabel class="truncate" :text="item.label" :html="item.labelHtml" />
      <NavBadge :item="item" />
      <NewTabHint />
    </a>
    <Link
      v-else-if="item.url"
      v-bind="item.extraAttributes ?? {}"
      :href="item.url"
      prefetch
      :cache-for="PREFETCH_CACHE_FOR"
      :data-active="item.active ? 'true' : undefined"
      :aria-current="item.active ? 'page' : undefined"
      :class="linkClass(depth)"
      @click="emit('navigate')"
    >
      <Icon v-if="item.icon" :name="item.icon" />
      <NavLabel class="truncate" :text="item.label" :html="item.labelHtml" />
      <NavBadge :item="item" />
    </Link>
    <p
      v-else
      :class="
        cn(
          'text-muted-foreground flex items-center gap-2 px-2 py-2 font-medium [&_svg]:size-4',
          props.itemClass,
          indent(depth),
        )
      "
    >
      <Icon v-if="item.icon" :name="item.icon" />
      <NavLabel class="truncate" :text="item.label" :html="item.labelHtml" />
    </p>
  </template>
</template>
