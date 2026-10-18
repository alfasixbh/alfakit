<script setup lang="ts">
import { onMounted } from 'vue'
import { useRegistry } from '../../context'
import { ensureFlashToasts } from '../../standalone/runtime'

/** Turns flashed Alfakit notifications into sonner toasts. Mount once. */
const registry = useRegistry()

// Inertia 3 delivers flash data as `page.flash` (and a `flash` event), not as a page prop,
// so this shares the listener the standalone toaster uses. Mounted only: showing toasts
// during a server render would leak them into other requests.
onMounted(() => {
  ensureFlashToasts(registry)
})
</script>

<template>
  <slot />
</template>
