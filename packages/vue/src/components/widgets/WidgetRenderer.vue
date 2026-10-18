<script setup lang="ts">
import type { WidgetSchema } from '@alfakit/core'
import { resolveFirst, widgetRegistryKeys } from '@alfakit/core'
import { computed } from 'vue'
import { useRegistry, useT } from '../../context'
import Slot from '../panel/Slot.vue'
import DataTable from '../table/DataTable.vue'
import { ChartWidget } from './chart-lazy'
import StatsOverviewWidget from './StatsOverviewWidget.vue'

const props = defineProps<{ widget: WidgetSchema }>()
const registry = useRegistry()
const t = useT()
// Registered components win over the built-in renderers: `Widget::$component`, then
// `widget:<type>` (e.g. `widget:Chart`), then a custom widget's own type.
const custom = computed(() => resolveFirst(registry, widgetRegistryKeys(props.widget)))
const customProps = computed(() => (props.widget.type === 'View' ? (props.widget.props ?? {}) : {}))
</script>

<template>
  <component :is="custom" v-if="custom" v-bind="customProps" :widget="props.widget" />
  <StatsOverviewWidget
    v-else-if="props.widget.type === 'StatsOverviewWidget'"
    :widget="props.widget"
  />
  <ChartWidget v-else-if="props.widget.type === 'Chart'" :widget="props.widget" />
  <template v-else-if="props.widget.type === 'TableWidget'">
    <Slot name="table-widget.start" :scope="props.widget.component" />
    <DataTable :table="props.widget.table" :component="props.widget.component" />
    <Slot name="table-widget.end" :scope="props.widget.component" />
  </template>
  <div
    v-else-if="props.widget.type === 'View'"
    class="text-destructive rounded-md border border-dashed p-3 text-xs"
  >
    {{
      t(
        'widget_not_registered',
        { component: props.widget.component },
        'Widget component :component is not registered.',
      )
    }}
  </div>
</template>
