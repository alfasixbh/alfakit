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
import DebugPanelSlot from '../components/panel/DebugPanelSlot.vue'
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
  <!-- The reading direction and language of Alfakit's content only: the host layout around it
       (sidebar, header) and the app's own pages keep the document's. -->
  <div
    data-slot="starter-kit-root"
    :dir="page.props.alfakit?.localization?.direction ?? 'ltr'"
    :lang="page.props.alfakit?.localization?.tag"
    class="contents"
  >
    <AlfakitRoot :toaster-id="STARTER_KIT_TOASTER_ID">
      <slot />
      <!-- The debug panel's button lives in AlfaKit's top bar, which a starter kit doesn't
           render: float it in the corner (nothing without `alfakitDebug`). The corner is the
           document's right: the kit's sidebar stays on the left in a right-to-left panel language. -->
      <div data-slot="starter-kit-debug-panel" class="fixed right-16 bottom-16 z-40">
        <DebugPanelSlot />
      </div>
    </AlfakitRoot>
  </div>
</template>
