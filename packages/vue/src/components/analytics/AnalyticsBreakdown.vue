<script setup lang="ts">
import type { AnalyticsBreakdownWidgetSchema } from '@alfakit/core'
import { analyticsInitialTab } from '@alfakit/core'
import { computed, ref } from 'vue'
import { useDirection, useT } from '../../context'
import Card from '../ui/Card.vue'
import Tabs from '../ui/Tabs.vue'
import TabsContent from '../ui/TabsContent.vue'
import TabsList from '../ui/TabsList.vue'
import TabsTrigger from '../ui/TabsTrigger.vue'
import AnalyticsBreakdownRow from './AnalyticsBreakdownRow.vue'

/**
 * An analytics top list (`analytics:breakdown`): a tab per dimension, each row a bar that
 * links to the dashboard filtered by it. Every number arrives formatted by the server.
 */
const props = defineProps<{ widget: AnalyticsBreakdownWidgetSchema }>()

const t = useT()
const direction = useDirection()
const active = ref(analyticsInitialTab(props.widget))
const current = computed(() =>
  props.widget.tabs.some((tab) => tab.key === active.value)
    ? active.value
    : analyticsInitialTab(props.widget),
)

function select(value: string | number) {
  active.value = String(value)
}
</script>

<template>
  <Card data-slot="analytics-breakdown" class="gap-0 overflow-hidden py-0">
    <Tabs :model-value="current" :dir="direction" class="gap-0" @update:model-value="select">
      <div class="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h3 class="text-base font-semibold">{{ widget.heading }}</h3>
        <TabsList
          v-if="widget.tabs.length > 1"
          :aria-label="t('analytics.views', { panel: widget.heading }, ':panel views')"
          class="max-w-full overflow-x-auto"
        >
          <TabsTrigger
            v-for="tab in widget.tabs"
            :key="tab.key"
            :value="tab.key"
            class="flex-none"
            :data-filtered="tab.filtered ? 'true' : undefined"
          >
            {{ tab.label }}
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent v-for="tab in widget.tabs" :key="tab.key" :value="tab.key" class="px-3 pb-4">
        <div
          class="text-muted-foreground flex items-center gap-3 px-2 pb-1.5 text-xs font-medium tracking-wide uppercase"
          aria-hidden="true"
        >
          <span class="min-w-0 flex-1 truncate">{{ tab.columns[0] }}</span>
          <span class="w-16 text-end">{{ tab.columns[1] }}</span>
          <span class="hidden w-20 text-end sm:block">{{ tab.columns[2] }}</span>
        </div>
        <p v-if="tab.rows.length === 0" class="text-muted-foreground px-2 py-6 text-center text-sm">
          {{ widget.emptyLabel ?? t('analytics.empty', {}, 'No data for this period') }}
        </p>
        <ul v-else class="flex flex-col gap-0.5" :aria-label="tab.label">
          <li v-for="row in tab.rows" :key="row.key">
            <AnalyticsBreakdownRow :row="row" :columns="tab.columns" />
          </li>
        </ul>
      </TabsContent>
    </Tabs>
  </Card>
</template>
