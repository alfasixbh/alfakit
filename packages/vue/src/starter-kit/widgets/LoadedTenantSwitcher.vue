<script setup lang="ts">
import type { StarterKitWidgets } from '@alfakit/core'
import { toRef } from 'vue'
import TenantMenu from '../../components/panel/TenantMenu.vue'
import TenantChooser from './TenantChooser.vue'
import TenantSwitcherTrigger from './TenantSwitcherTrigger.vue'
import { useWidgetsPanel } from './use-widgets'
import WidgetShell from './WidgetShell.vue'

/** The panel's tenant menu inside a tenant, a menu to choose one elsewhere. */
const props = defineProps<{ source: StarterKitWidgets }>()

const panel = useWidgetsPanel(toRef(props, 'source'))
</script>

<template>
  <WidgetShell v-if="panel" :panel="panel">
    <TenantMenu v-if="panel.tenancy?.current" variant="topbar" />
    <TenantChooser v-else />
  </WidgetShell>
  <TenantSwitcherTrigger v-else :source="props.source" />
</template>
