<script lang="ts">
import { computed, defineComponent } from 'vue'
import { useAlfakitProps, useOptionalRegistry } from '../../context'
import { lazyComponent } from '../../lib/lazy'

// The inspector's code loads only on pages that carry `alfakitDevTools` (`Panel::devTools()`
// with `app.debug` on), never with the panel's entry.
const DevToolsInspector = lazyComponent(
  'AlfakitDevToolsInspector',
  () => import('./DevToolsInspector.vue').then((module) => module.default),
  defineComponent({ name: 'AlfakitDevToolsLoading', render: () => null }),
)
</script>

<script setup lang="ts">
/**
 * Where the panel root mounts the schema inspector: nothing unless the page carries
 * `alfakitDevTools`, otherwise the registered `panel:dev-tools` component or the built-in
 * floating button and drawer.
 */
const props = useAlfakitProps()
const registry = useOptionalRegistry()
const Inspector = computed(() => registry?.resolve('panel:dev-tools') ?? DevToolsInspector)
</script>

<template>
  <component :is="Inspector" v-if="props.alfakitDevTools" />
</template>
