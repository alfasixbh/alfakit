<script lang="ts">
  import {
    announceDatabaseNotificationsSent,
    configureRealtime,
    subscribeToNotifications,
  } from '@alfakit/core'
  import { useOptionalRegistry, usePanel } from '../../context.svelte'
  import { showToast, type NotificationComponent } from './toast'

  /**
   * With `Panel::realtimeNotifications()` (or `realtime()`) and Laravel Echo, shows broadcast
   * notifications as toasts and refreshes the bell when one is stored. Effects only run in
   * the browser, so a server render never subscribes.
   */
  const registry = useOptionalRegistry()
  const panel = $derived(usePanel())
  const channel = $derived(panel?.realtime?.channel)

  // `Panel::realtime()`: where Echo authorises the panel's channels (used when the app has no
  // `window.Echo` of its own). `$effect.pre` runs before page components' effects listen.
  $effect.pre(() => {
    configureRealtime(panel?.realtime ?? null, { csrfToken: panel?.csrf })
  })

  $effect(() => {
    if (!channel) return

    return subscribeToNotifications({
      channel,
      onNotification: (notification) =>
        showToast(
          notification,
          registry?.resolve(notification.view ?? '') as NotificationComponent | undefined,
        ),
      onDatabaseNotificationsSent: announceDatabaseNotificationsSent,
    })
  })
</script>
