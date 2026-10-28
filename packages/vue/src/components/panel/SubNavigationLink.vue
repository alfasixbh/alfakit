<script setup lang="ts">
import NavLabel from './NavLabel.vue'
import type { NavigationItemSchema } from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import { computed } from 'vue'
import { Icon } from '../../lib/icons'
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
const hasBadge = computed(() => props.item.badge !== undefined && props.item.badge !== null)
</script>

<template>
  <span v-if="!props.item.url" v-bind="props.item.extraAttributes ?? {}" :class="classes">
    <Icon v-if="props.item.icon" :name="props.item.icon" />
    <NavLabel class="truncate" :text="props.item.label" :html="props.item.labelHtml" />
    <Badge v-if="hasBadge" variant="secondary" class="ms-auto px-1.5 py-0">
      {{ props.item.badge }}
    </Badge>
  </span>
  <a
    v-else-if="props.item.openInNewTab"
    v-bind="props.item.extraAttributes ?? {}"
    :href="props.item.url"
    target="_blank"
    rel="noopener noreferrer"
    :class="classes"
  >
    <Icon v-if="props.item.icon" :name="props.item.icon" />
    <NavLabel class="truncate" :text="props.item.label" :html="props.item.labelHtml" />
    <Badge v-if="hasBadge" variant="secondary" class="ms-auto px-1.5 py-0">
      {{ props.item.badge }}
    </Badge>
  </a>
  <Link
    v-else
    v-bind="props.item.extraAttributes ?? {}"
    :href="props.item.url"
    :class="classes"
    :aria-current="props.item.active ? 'page' : undefined"
  >
    <Icon v-if="props.item.icon" :name="props.item.icon" />
    <NavLabel class="truncate" :text="props.item.label" :html="props.item.labelHtml" />
    <Badge
      v-if="hasBadge"
      variant="secondary"
      class="ms-auto px-1.5 py-0"
      :title="props.item.badgeTooltip"
    >
      {{ props.item.badge }}
    </Badge>
  </Link>
</template>
