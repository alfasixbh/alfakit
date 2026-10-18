<script setup lang="ts">
import type { TabSchema } from '@alfakit/core'
import { badgeColorClasses, colorClass } from '../../lib/colors'
import { cn } from '../../lib/utils'
import Badge from '../ui/Badge.vue'
import { useDeferredBadge } from './deferred'

/** A schema tab's badge; `deferBadge()` badges appear once loaded. */
const props = defineProps<{ tab: TabSchema }>()
const badge = useDeferredBadge(props.tab)
</script>

<template>
  <Badge
    v-if="badge.badge !== undefined && badge.badge !== null"
    variant="outline"
    :title="badge.badgeTooltip ?? undefined"
    :class="
      cn('ms-1 px-1.5 py-0', colorClass(badgeColorClasses, badge.badgeColor ?? undefined, 'gray'))
    "
    >{{ badge.badge }}</Badge
  >
</template>
