<script setup lang="ts">
import type { DashboardCustomizeSchema, WidgetsBlock } from '@alfakit/core'
import { columnSpanClasses, gridColumnsClasses, isLazyPlaceholder } from '@alfakit/core'
import { cn } from '../../lib/utils'
import LazyWidgetPlaceholder from '../panel/LazyWidgetPlaceholder.vue'
import WidgetRenderer from './WidgetRenderer.vue'

/** The widgets of a dashboard (or a customizable one until its editor has loaded). */
// `customize` comes along when it stands in for the editor; the plain grid ignores it.
const props = defineProps<{ block: WidgetsBlock; customize?: DashboardCustomizeSchema }>()
</script>

<template>
  <div data-slot="widgets" :class="cn('grid gap-6', gridColumnsClasses(props.block.columns))">
    <div
      v-for="widget in props.block.widgets"
      :key="widget.key"
      :class="cn('min-w-0', columnSpanClasses(widget.columnSpan))"
    >
      <LazyWidgetPlaceholder v-if="isLazyPlaceholder(widget)" :widget="widget" />
      <WidgetRenderer v-else :widget="widget" />
    </div>
  </div>
</template>
