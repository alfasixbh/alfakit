<script setup lang="ts">
import NavLabel from './NavLabel.vue'
import type { NavigationItemSchema } from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import { computed } from 'vue'
import { badgeColorClasses, colorClass } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import NewTabHint from '../../lib/NewTabHint.vue'
import { cn } from '../../lib/utils'
import Badge from '../ui/Badge.vue'

const props = defineProps<{ item: NavigationItemSchema; tab: boolean }>()

const classes = computed(() =>
  cn(
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
    props.tab ? 'shrink-0 whitespace-nowrap' : 'shrink-0 whitespace-nowrap @2xl:w-full @2xl:shrink',
    props.item.active
      ? 'bg-accent text-accent-foreground font-medium'
      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
  ),
)
// The element and its own attributes: plain text, a new-tab anchor or an Inertia link.
const tag = computed(() => (!props.item.url ? 'span' : props.item.openInNewTab ? 'a' : Link))
const attributes = computed(() =>
  !props.item.url
    ? {}
    : props.item.openInNewTab
      ? { href: props.item.url, target: '_blank', rel: 'noopener noreferrer' }
      : { href: props.item.url, 'aria-current': props.item.active ? 'page' : undefined },
)
</script>

<template>
  <component
    :is="tag"
    v-bind="{ ...(props.item.extraAttributes ?? {}), ...attributes }"
    :class="classes"
  >
    <Icon v-if="props.item.icon" :name="props.item.icon" />
    <NavLabel class="truncate" :text="props.item.label" :html="props.item.labelHtml" />
    <Badge
      v-if="props.item.badge !== undefined && props.item.badge !== null"
      variant="outline"
      :class="
        cn('ms-auto px-1.5 py-0', colorClass(badgeColorClasses, props.item.badgeColor, 'gray'))
      "
      :title="props.item.badgeTooltip"
    >
      {{ props.item.badge }}
    </Badge>
    <NewTabHint v-if="props.item.url && props.item.openInNewTab" />
  </component>
</template>
