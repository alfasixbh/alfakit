<script setup lang="ts">
import {
  announceDatabaseNotificationsSent,
  configureRealtime,
  subscribeToNotifications,
} from '@alfakit/core'
import { onMounted, onScopeDispose, watch } from 'vue'
import { useOptionalRegistry, usePanel } from '../../context'
import { showToast } from './flash-toasts'

/**
 * With `Panel::realtimeNotifications()` (or `realtime()`) and Laravel Echo, shows broadcast
 * notifications as toasts and refreshes the bell when one is stored. Subscribes in the
 * browser only (never during a server render).
 */
const panel = usePanel()
const registry = useOptionalRegistry()
let unsubscribe: (() => void) | null = null

// `Panel::realtime()`: where Echo authorises the panel's channels (used when the app has no
// `window.Echo` of its own). Kept current before page components start listening.
if (typeof window !== 'undefined') {
  watch(
    () => [JSON.stringify(panel.value?.realtime ?? null), panel.value?.csrf],
    () => configureRealtime(panel.value?.realtime ?? null, { csrfToken: panel.value?.csrf }),
    { immediate: true, flush: 'sync' },
  )
}

onMounted(() => {
  watch(
    () => panel.value?.realtime?.channel,
    (channel) => {
      unsubscribe?.()
      unsubscribe = channel
        ? subscribeToNotifications({
            channel,
            onNotification: (notification) =>
              showToast(notification, registry?.resolve(notification.view ?? '')),
            onDatabaseNotificationsSent: announceDatabaseNotificationsSent,
          })
        : null
    },
    { immediate: true },
  )
})

onScopeDispose(() => unsubscribe?.())
</script>

<template>
  <slot />
</template>
