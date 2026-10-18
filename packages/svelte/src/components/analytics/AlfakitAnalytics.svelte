<script lang="ts">
  import { startAnalytics } from '@alfakit/core'
  import { router } from '@inertiajs/svelte'
  import { onMount } from 'svelte'

  /**
   * Privacy-first page views for the public pages of an Inertia app
   * (alfasix/alfakit-analytics): no cookies, no storage, honours Do Not Track and Global
   * Privacy Control. Renders nothing; mount it once in your public layout. Record custom
   * events with `trackAnalyticsEvent()`.
   *
   * `<AlfakitAnalytics siteKey="k3y" />`
   */
  let {
    siteKey,
    endpoint,
    trackLocalhost,
  }: { siteKey: string; endpoint?: string; trackLocalhost?: boolean } = $props()

  onMount(() => {
    const { tracker, stop } = startAnalytics({ siteKey, endpoint, trackLocalhost })
    const off = router.on('navigate', () => tracker.pageview())

    return () => {
      off()
      stop()
    }
  })
</script>
