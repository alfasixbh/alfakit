<script setup lang="ts">
import { startAnalytics } from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Privacy-first page views for the public pages of an Inertia app (alfasix/alfakit-analytics):
 * no cookies, no storage, honours Do Not Track and Global Privacy Control. Renders nothing;
 * mount it once in your public layout. Record custom events with `trackAnalyticsEvent()`.
 *
 * `<AlfakitAnalytics site-key="k3y" />`
 */
const props = defineProps<{ siteKey: string; endpoint?: string; trackLocalhost?: boolean }>()

let cleanup: (() => void) | null = null

onMounted(() => {
  const { tracker, stop } = startAnalytics({
    siteKey: props.siteKey,
    endpoint: props.endpoint,
    trackLocalhost: props.trackLocalhost,
  })
  const off = router.on('navigate', () => tracker.pageview())

  cleanup = () => {
    off()
    stop()
  }
})

onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <slot />
</template>
