<script setup lang="ts">
import {
  starterKitCopilot,
  takeRequestedStarterKitCopilot,
  type StarterKitWidgets,
} from '@alfakit/core'
import { computed, toRef } from 'vue'
import AiCopilot from '../../components/ai/AiCopilot.vue'
import CopilotTrigger from './CopilotTrigger.vue'
import { useWidgetsPanel } from './use-widgets'
import WidgetShell from './WidgetShell.vue'

/** The AI copilot (the panel pages' `topbar.end` slot component), once its data has loaded. */
const props = defineProps<{ source: StarterKitWidgets }>()

const panel = useWidgetsPanel(toRef(props, 'source'))
const component = computed(() => (panel.value ? starterKitCopilot(panel.value) : null))
// A click or the key bindings before the copilot loaded open it at once.
const autoOpen = computed(() => component.value !== null && takeRequestedStarterKitCopilot())
</script>

<template>
  <template v-if="panel">
    <WidgetShell v-if="component" :panel="panel">
      <AiCopilot :component="component" :auto-open="autoOpen" />
    </WidgetShell>
  </template>
  <CopilotTrigger v-else :source="props.source" />
</template>
