<script setup lang="ts">
import { isAlfakitPage, type StarterKitWidgets } from '@alfakit/core'
import { usePage } from '@inertiajs/vue3'
import { computed, toRef } from 'vue'
import NotificationsMenu from '../../components/notifications/NotificationsMenu.vue'
import RealtimeNotifications from '../../components/notifications/RealtimeNotifications.vue'
import NotificationsTrigger from './NotificationsTrigger.vue'
import { useWidgetsPanel } from './use-widgets'
import WidgetShell from './WidgetShell.vue'

/** The notifications bell, with realtime notifications on the host's own pages. */
const props = defineProps<{ source: StarterKitWidgets }>()

const page = usePage()
const panel = useWidgetsPanel(toRef(props, 'source'))
// Alfakit pages subscribe to realtime notifications themselves.
const alfakitPage = computed(() => isAlfakitPage(page.props))
</script>

<template>
  <WidgetShell v-if="panel" :panel="panel">
    <NotificationsMenu />
    <RealtimeNotifications v-if="!alfakitPage" />
  </WidgetShell>
  <NotificationsTrigger v-else :source="props.source" />
</template>
