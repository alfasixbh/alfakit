<script setup lang="ts">
import type { StatsOverviewWidgetSchema } from '@alfakit/core'
import { gridColumnsClasses, widgetPollTarget } from '@alfakit/core'
import { computed, watch } from 'vue'
import { usePollComponent } from '../../context'
import { cn } from '../../lib/utils'
import StatCard from './StatCard.vue'
import { useLiveUpdates } from '../realtime/use-live-updates'

const props = defineProps<{ widget: StatsOverviewWidgetSchema }>()
const columns = computed(
  () =>
    props.widget.columns ?? {
      default: 1,
      md: Math.min(props.widget.stats.length, 2),
      lg: Math.min(props.widget.stats.length, 4),
    },
)

// Polls refresh only this widget, share one request with other components on the same
// interval and pause while the tab is hidden.
const pollComponent = usePollComponent()

watch(
  [() => widgetPollTarget(props.widget), () => props.widget.pollingInterval],
  ([target, pollingInterval], _old, onCleanup) => onCleanup(pollComponent(target, pollingInterval)),
  { immediate: true },
)

// `live()`: refresh when the followed records change (broadcast), else poll as a fallback.
useLiveUpdates(() => ({
  live: props.widget.live,
  target: widgetPollTarget(props.widget),
  polling: Boolean(props.widget.pollingInterval),
}))
</script>

<template>
  <section class="flex flex-col gap-3" :aria-label="props.widget.heading || undefined">
    <div v-if="props.widget.heading || props.widget.description">
      <h3 v-if="props.widget.heading" class="text-base font-semibold">
        {{ props.widget.heading }}
      </h3>
      <p v-if="props.widget.description" class="text-muted-foreground text-sm">
        {{ props.widget.description }}
      </p>
    </div>
    <div :class="cn('grid gap-4', gridColumnsClasses(columns))">
      <StatCard v-for="(stat, index) in props.widget.stats" :key="index" :stat="stat" />
    </div>
  </section>
</template>
