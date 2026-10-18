<script setup lang="ts">
import type { HelpdeskInboxSchema } from '@alfakit/core'
import HelpdeskInboxView from './HelpdeskInboxView.vue'

/**
 * The helpdesk agent inbox (schema component `helpdesk:inbox`, alfasix/alfakit-helpdesk):
 * views, the ticket list and the conversation side by side, a quick composer, keyboard
 * shortcuts (`j` / `k`, `r`, `n`, `/`) and live updates.
 */
const props = defineProps<{ component: HelpdeskInboxSchema }>()
</script>

<template>
  <HelpdeskInboxView :key="props.component.actionComponent" :schema="props.component" />
</template>
