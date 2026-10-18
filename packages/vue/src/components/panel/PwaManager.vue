<script setup lang="ts">
import { applyPwaUpdate, pwaStore, startPwa } from '@alfakit/core'
import { onMounted, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useStore } from '../../composables/use-store'
import { usePanel, useT } from '../../context'

/**
 * `Panel::pwa()`: registers the service worker and offers "Reload" when a new version
 * waits. Renders nothing; does nothing without `pwa` or during a server render.
 */
const panel = usePanel()
const t = useT()
const state = useStore(pwaStore)

onMounted(() => {
  watch(
    () => panel.value?.pwa,
    (pwa) => startPwa(pwa),
    { immediate: true },
  )
})

watch(
  () => state.value.updateAvailable,
  (available) => {
    if (!available) return

    toast(t('pwa.update_available', {}, 'A new version is available'), {
      id: 'alfakit-pwa-update',
      duration: Infinity,
      action: { label: t('pwa.reload', {}, 'Reload'), onClick: () => applyPwaUpdate() },
    })
  },
  { immediate: true },
)
</script>

<template>
  <slot />
</template>
