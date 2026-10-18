import {
  announceDatabaseNotificationsSent,
  configureRealtime,
  subscribeToNotifications,
} from '@alfakit/core'
import { useEffect } from 'react'
import { useOptionalRegistry, usePanel } from '../../context'
import { showToast } from './flash-toasts'

/**
 * With `Panel::realtimeNotifications()` (or `realtime()`) and Laravel Echo, shows broadcast
 * notifications as toasts and refreshes the bell when one is stored. Renders nothing; the
 * subscription only starts in the browser.
 */
export function RealtimeNotifications() {
  const panel = usePanel()
  const registry = useOptionalRegistry()
  const realtime = panel?.realtime
  const channel = realtime?.channel

  // `Panel::realtime()`: where Echo authorises the panel's channels (used when the app has
  // no `window.Echo` of its own). Set while rendering, before any page component (presence,
  // live tables) starts listening in its effects.
  if (typeof window !== 'undefined') {
    configureRealtime(realtime ?? null, { csrfToken: panel?.csrf })
  }

  useEffect(() => {
    if (!channel) return

    return subscribeToNotifications({
      channel,
      onNotification: (notification) =>
        showToast(notification, registry?.resolve(notification.view ?? '')),
      onDatabaseNotificationsSent: announceDatabaseNotificationsSent,
    })
  }, [channel, registry])

  return null
}
