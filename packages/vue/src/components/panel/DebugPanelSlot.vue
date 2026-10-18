<script lang="ts">
import { computed, defineComponent } from 'vue'
import { useAlfakitProps, useOptionalRegistry } from '../../context'
import { lazyComponent } from '../../lib/lazy'

// The drawer's code loads only on pages that carry `alfakitDebug` (`Panel::debugPanel()`
// with `app.debug` on), never with the panel's entry.
const DebugPanel = lazyComponent(
  'AlfakitDebugPanel',
  () => import('./DebugPanel.vue').then((module) => module.default),
  defineComponent({ name: 'AlfakitDebugPanelLoading', render: () => null }),
)
</script>

<script setup lang="ts">
/**
 * Where the top bars put the debug panel: nothing unless the page carries `alfakitDebug`,
 * otherwise the registered `panel:debug-panel` component or the built-in drawer.
 */
const props = useAlfakitProps()
const registry = useOptionalRegistry()
const Panel = computed(() => registry?.resolve('panel:debug-panel') ?? DebugPanel)
</script>

<template>
  <component :is="Panel" v-if="props.alfakitDebug" />
</template>
