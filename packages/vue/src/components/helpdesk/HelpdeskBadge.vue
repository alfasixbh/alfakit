<script setup lang="ts">
import type { HelpdeskBadge, HelpdeskSla, LocaleFormatter } from '@alfakit/core'
import { computed } from 'vue'
import { useT } from '../../context'
import { badgeColorClasses, colorClass } from '../../lib/colors'
import Badge from '../ui/Badge.vue'

/** A status / priority badge, or an SLA badge with its due time. */
const props = defineProps<{
  badge?: HelpdeskBadge
  sla?: HelpdeskSla
  formatter?: LocaleFormatter
}>()
const t = useT()

const color = computed(() => props.badge?.color ?? props.sla?.color ?? 'gray')
const showsDue = computed(
  () =>
    props.sla?.dueAt !== undefined &&
    ['due_soon', 'breached', 'on_track'].includes(props.sla.state) &&
    props.formatter !== undefined,
)
</script>

<template>
  <Badge
    v-if="props.badge || (props.sla && props.sla.state !== 'none')"
    variant="outline"
    :class="colorClass(badgeColorClasses, color, 'gray')"
    :title="
      props.sla?.dueAt && props.formatter ? props.formatter.dateTime(props.sla.dueAt) : undefined
    "
  >
    {{ props.badge?.label ?? props.sla?.label }}
    <span v-if="showsDue" class="font-normal opacity-80"
      >·
      {{
        t('helpdesk.due', { time: props.formatter!.relative(props.sla!.dueAt!) }, 'Due :time')
      }}</span
    >
  </Badge>
</template>
