<script lang="ts">
import { lazyComponent } from '../../lib/lazy'
import PlainWidgetGrid from './PlainWidgetGrid.vue'

// The dashboard editor's code loads with the first customizable dashboard; until then (and
// on the server) its widgets show in the plain grid.
const DashboardCustomizer = lazyComponent(
  'DashboardCustomizer',
  () => import('./DashboardCustomizer.vue').then((module) => module.default),
  PlainWidgetGrid,
)
</script>

<script setup lang="ts">
import type { WidgetsBlock } from '@alfakit/core'

const props = defineProps<{ block: WidgetsBlock }>()
</script>

<template>
  <!-- `Dashboard::customizable()`: the grid with its "Edit dashboard" mode. -->
  <DashboardCustomizer
    v-if="props.block.customize"
    :block="props.block"
    :customize="props.block.customize"
  />
  <PlainWidgetGrid v-else :block="props.block" />
</template>
