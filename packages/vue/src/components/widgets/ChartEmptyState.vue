<script setup lang="ts">
import type { ChartWidgetSchema } from '@alfakit/core'
import { ChartColumnIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useRegistry, useT } from '../../context'
import { Icon } from '../../lib/icons'
import { usePageActionContext } from '../actions/action-context'
import ActionList from '../actions/ActionList.vue'

/**
 * Shown when `getData()` returns nothing: a registered `$emptyStateView` component, or the
 * icon, texts and `getEmptyStateActions()` (run through the widget, `widget:<id>`).
 */
const props = defineProps<{ widget: ChartWidgetSchema }>()
const t = useT()
const registry = useRegistry()
const page = usePageActionContext()
const state = computed(() => props.widget.emptyState)
const view = computed(() => (state.value?.view ? registry.resolve(state.value.view) : undefined))
const context = computed(() => ({ token: page.token, component: `widget:${props.widget.id}` }))
const minHeight = computed(() => props.widget.maxHeight ?? '18rem')
</script>

<template>
  <div v-if="view" data-slot="chart-empty-state" :style="{ minHeight }">
    <component :is="view" v-bind="state?.viewData ?? {}" :widget="props.widget" />
  </div>
  <div
    v-else
    data-slot="chart-empty-state"
    class="flex flex-col items-center justify-center gap-2 py-10 text-center"
    :style="{ minHeight }"
  >
    <div
      class="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full"
    >
      <Icon v-if="state?.icon" :name="state.icon" class="size-5" />
      <Icon
        v-else
        name="alfakit::widgets.chart.empty-state"
        :fallback="ChartColumnIcon"
        class="size-5"
      />
    </div>
    <p class="text-sm font-medium">
      {{ state?.heading ?? t('chart_empty', {}, 'No data to show') }}
    </p>
    <p v-if="state?.description" class="text-muted-foreground text-sm">
      {{ state.description }}
    </p>
    <ActionList
      v-if="state?.actions && state.actions.length > 0"
      :actions="state.actions"
      :context="context"
      size="sm"
      class="mt-2 justify-center"
    />
  </div>
</template>
