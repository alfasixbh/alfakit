import type { AnalyticsTrackerOptions } from '@alfakit/core'
import { startAnalytics } from '@alfakit/core'
import { router } from '@inertiajs/react'
import { useEffect } from 'react'

/**
 * Privacy-first page views for the public pages of an Inertia app (alfasix/alfakit-analytics):
 * no cookies, no storage, honours Do Not Track and Global Privacy Control. Renders nothing;
 * mount it once in your public layout. Record custom events with `trackAnalyticsEvent()`.
 *
 * ```tsx
 * <AlfakitAnalytics siteKey="k3y" />
 * ```
 */
export function AlfakitAnalytics({ siteKey, endpoint, trackLocalhost }: AnalyticsTrackerOptions) {
  useEffect(() => {
    const { tracker, stop } = startAnalytics({ siteKey, endpoint, trackLocalhost })
    const off = router.on('navigate', () => tracker.pageview())

    return () => {
      off()
      stop()
    }
  }, [siteKey, endpoint, trackLocalhost])

  return null
}
