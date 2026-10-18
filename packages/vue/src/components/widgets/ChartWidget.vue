<script setup lang="ts">
import type { ChartWidgetSchema } from '@alfakit/core'
import {
  buildChartConfig,
  getChartPlugins,
  observeThemeChanges,
  resolvePartialProps,
  widgetPollTarget,
} from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { Chart, registerables, type ChartConfiguration, type Plugin } from 'chart.js'
import { ChevronDownIcon } from '@lucide/vue'
import { onMounted, onScopeDispose, ref, toRaw, useId, watch } from 'vue'
import { useDirection, useLocalization, usePollComponent, useT } from '../../context'
import { cssColor } from '../../lib/colors'
import { cn } from '../../lib/utils'
import Button from '../ui/Button.vue'
import ChartEmptyState from './ChartEmptyState.vue'
import ChartFilters from './ChartFilters.vue'
import Card from '../ui/Card.vue'
import CardContent from '../ui/CardContent.vue'
import CardDescription from '../ui/CardDescription.vue'
import CardHeader from '../ui/CardHeader.vue'
import CardTitle from '../ui/CardTitle.vue'
import { useLiveUpdates } from '../realtime/use-live-updates'

const t = useT()

Chart.register(...registerables)

const props = defineProps<{ widget: ChartWidgetSchema }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const direction = useDirection()
const localization = useLocalization()
// Bumped when the theme or dark mode changes so colours are re-read from CSS.
const themeVersion = ref(0)
let chart: Chart | null = null

const buildConfig = (): ChartConfiguration => {
  void themeVersion.value

  return buildChartConfig({
    type: props.widget.chartType,
    data: toRaw(props.widget.data),
    options: toRaw(props.widget.options),
    rtl: direction.value === 'rtl',
    locale: localization.value?.tag ?? 'en',
    color: props.widget.color,
  }) as unknown as ChartConfiguration
}

const collapsed = ref(false)
const bodyId = useId()

const create = () => {
  chart?.destroy()

  // `createAlfakit({ chartPlugins })`, registered before the chart is drawn.
  const plugins = getChartPlugins() as Plugin[]

  if (plugins.length > 0) Chart.register(...plugins)

  chart = canvas.value ? new Chart(canvas.value, buildConfig()) : null
}

let stopObservingTheme: (() => void) | null = null

onMounted(() => {
  create()
  stopObservingTheme = observeThemeChanges(() => themeVersion.value++)
})

// The chart is only re-created when its type changes or its canvas comes back (after
// being collapsed or empty); polling, theme, direction and locale changes update it in place.
watch(() => props.widget.chartType, create)
watch(canvas, (element) => {
  if (element) {
    create()
  } else {
    chart?.destroy()
    chart = null
  }
})
watch(
  () => [
    props.widget.data,
    props.widget.options,
    props.widget.color,
    direction.value,
    localization.value?.tag,
    themeVersion.value,
  ],
  () => {
    if (!chart) return

    const config = buildConfig()
    chart.data = config.data
    chart.options = config.options ?? {}
    chart.update()
  },
  { deep: true },
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

onScopeDispose(() => {
  stopObservingTheme?.()
  chart?.destroy()
  chart = null
})

const setFilter = (event: Event) => {
  const url = new URL(window.location.href)
  url.searchParams.set(
    `widgetFilters[${props.widget.id}]`,
    (event.target as HTMLSelectElement).value,
  )
  router.visit(url.toString(), {
    only: resolvePartialProps(['page']),
    preserveScroll: true,
    preserveState: true,
    replace: true,
  })
}
</script>

<template>
  <Card class="gap-4 py-4" :data-chart-type="props.widget.chartType">
    <CardHeader
      v-if="
        props.widget.heading ||
        props.widget.description ||
        props.widget.filters ||
        props.widget.filtersForm ||
        props.widget.collapsible
      "
      class="px-5"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <CardTitle v-if="props.widget.heading" class="text-base">{{
            props.widget.heading
          }}</CardTitle>
          <CardDescription v-if="props.widget.description">{{
            props.widget.description
          }}</CardDescription>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <select
            v-if="props.widget.filters"
            :value="props.widget.filter ?? ''"
            :aria-label="t('chart_filter', {}, 'Chart filter')"
            class="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
            @change="setFilter"
          >
            <option
              v-for="filter in props.widget.filters"
              :key="filter.value"
              :value="filter.value"
            >
              {{ filter.label }}
            </option>
          </select>
          <ChartFilters
            v-if="props.widget.filtersForm"
            :key="JSON.stringify(props.widget.filtersForm.state)"
            :form="props.widget.filtersForm"
            :widget-id="props.widget.id"
          />
          <Button
            v-if="props.widget.collapsible"
            type="button"
            variant="ghost"
            size="icon-sm"
            :aria-expanded="!collapsed"
            :aria-controls="bodyId"
            :aria-label="t('toggle_section', {}, 'Toggle section')"
            @click="collapsed = !collapsed"
            ><ChevronDownIcon
              :class="cn('transition-transform', collapsed && '-rotate-90 rtl:rotate-90')"
          /></Button>
        </div>
      </div>
    </CardHeader>
    <CardContent v-if="!collapsed" :id="bodyId" class="px-5">
      <ChartEmptyState v-if="props.widget.empty" :widget="props.widget" />
      <div
        v-else
        data-slot="chart-canvas"
        :style="{ height: props.widget.maxHeight ?? '18rem', color: cssColor('gray') }"
      >
        <canvas
          ref="canvas"
          role="img"
          :aria-label="props.widget.heading ?? t('chart', {}, 'Chart')"
          :aria-describedby="props.widget.assistiveContent ? `${bodyId}-assistive` : undefined"
        />
        <!-- `getChartAssistiveContent()`: the chart's values for screen readers. -->
        <div
          v-if="props.widget.assistiveContent"
          :id="`${bodyId}-assistive`"
          class="sr-only"
          data-slot="chart-assistive-content"
          v-html="props.widget.assistiveContent"
        />
      </div>
    </CardContent>
  </Card>
</template>
