<script setup lang="ts">
import { openRequestedStarterKitSearch, type StarterKitWidgets } from '@alfakit/core'
import { nextTick, toRef, watch } from 'vue'
import GlobalSearch from '../../components/panel/GlobalSearch.vue'
import SearchTrigger from './SearchTrigger.vue'
import { useWidgetsPanel } from './use-widgets'
import WidgetShell from './WidgetShell.vue'

/** The panel's command palette and global search, once its data has loaded. */
const props = defineProps<{ source: StarterKitWidgets }>()

const panel = useWidgetsPanel(toRef(props, 'source'))

// A click or the key bindings before the palette loaded open it once it mounted.
watch(
  () => panel.value !== null,
  async (ready) => {
    if (!ready) return

    await nextTick()
    openRequestedStarterKitSearch()
  },
  { immediate: true },
)
</script>

<template>
  <WidgetShell v-if="panel" :panel="panel">
    <GlobalSearch />
  </WidgetShell>
  <SearchTrigger v-else :source="props.source" />
</template>
