<script setup lang="ts">
import {
  STARTER_KIT_TOASTER_ID,
  installStarterKitRuntime,
  syncStarterKitPage,
  type AlfakitPageProps,
} from '@alfakit/core'
import { usePage } from '@inertiajs/vue3'
import { onMounted, onUnmounted, watch } from 'vue'
import AlfakitRoot from '../AlfakitRoot.vue'
import { setToasterId, showToast } from '../components/notifications/flash-toasts'
import { provideAlfakit } from '../context'
import { starterKitContext, type StarterKitPageOptions } from './runtime'

/**
 * The Inertia layout around every Alfakit page in starter kit mode, inside the host layout:
 * Alfakit's context, modals, toasts and the reading direction. It stays mounted while the
 * user moves between Alfakit pages.
 */
const props = defineProps<{ options?: StarterKitPageOptions }>()
const context = starterKitContext(props.options ?? {})
const page = usePage<AlfakitPageProps>()

provideAlfakit(context)

// Endpoints follow the open page (synchronously, before children run actions).
watch(
  () => page.props.alfakit?.endpoints,
  (endpoints) => {
    if (endpoints) {
      context.actions.setEndpoints({ action: endpoints.action ?? '', modal: endpoints.modal ?? '' })
    }
  },
  { immediate: true, flush: 'sync' },
)

onMounted(() => {
  installStarterKitRuntime(
    (notification) => showToast(notification),
    (key, replacements, fallback) => context.translator.t(key, replacements, fallback),
  )
  setToasterId(STARTER_KIT_TOASTER_ID)

  watch(
    () => page.props,
    (value) => syncStarterKitPage(value as AlfakitPageProps),
    { immediate: true },
  )
})

onUnmounted(() => {
  // A host page is open: its errors and toasts are the host's again.
  syncStarterKitPage(null)
  setToasterId(undefined)
})
</script>

<template>
  <AlfakitRoot :toaster-id="STARTER_KIT_TOASTER_ID">
    <slot />
  </AlfakitRoot>
</template>
