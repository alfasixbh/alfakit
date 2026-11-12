<script setup lang="ts">
import type { NavigationItemSchema } from '@alfakit/core'
import { useT } from '../../context'
import { badgeColorClasses, colorClass } from '../../lib/colors'
import { cn } from '../../lib/utils'
import Badge from '../ui/Badge.vue'

/** A navigation item's badge, or its placeholder while `deferNavigationBadges()` loads. */
const props = defineProps<{ item: NavigationItemSchema }>()
const t = useT()
</script>

<template>
  <Badge
    v-if="props.item.badge !== undefined && props.item.badge !== null"
    variant="outline"
    :class="cn('ms-auto px-1.5 py-0', colorClass(badgeColorClasses, props.item.badgeColor, 'gray'))"
    :title="props.item.badgeTooltip"
    >{{ props.item.badge }}</Badge
  >
  <span
    v-else-if="props.item.badgePending"
    data-slot="badge"
    role="status"
    aria-busy="true"
    :aria-label="t('loading', {}, 'Loading')"
    class="bg-muted-foreground/20 ms-auto inline-block h-4 w-5 animate-pulse rounded-md"
  />
</template>
