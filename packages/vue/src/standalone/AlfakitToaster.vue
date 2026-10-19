<script setup lang="ts">
import { resolveToastPosition, STARTER_KIT_TOASTER_ID, type ToastPosition } from '@alfakit/core'
import { onMounted, onUnmounted } from 'vue'
import { setToasterId } from '../components/notifications/flash-toasts'
import Toaster from '../components/ui/Toaster.vue'
import { useOptionalAlfakit } from '../context'
import { claimToaster, createStandaloneContext, ensureFlashToasts } from './runtime'

/**
 * Shows notifications flashed by standalone components (`Notification::make()->send()`
 * from `submit()` or an action) as toasts. Place it once in your app layout; a page whose
 * layout has none gets one from its first `<AlfakitComponent>`.
 *
 * Flash data comes from the `flash` Inertia event after each visit and from the initial
 * page (already fired before the app mounted), so it works in any layout.
 */
const props = withDefaults(
  defineProps<{
    /** Where toasts appear; `start`/`end` follow the reading direction. */
    position?: ToastPosition
    dir?: 'ltr' | 'rtl'
    /**
     * Render vue-sonner's `<Toaster>` too (default). Pass `false` when your layout already
     * mounts one: flashed Alfakit notifications are then shown through it.
     */
    toaster?: boolean
    /** @internal Set by `<AlfakitComponent>` when it takes the toaster role. */
    claimed?: boolean
  }>(),
  { dir: 'ltr', toaster: true, claimed: false },
)

// Outside <AlfakitComponent> the flash reader needs a registry for custom toast views.
const context =
  useOptionalAlfakit() ?? createStandaloneContext({ action: '', modal: '' }, undefined, undefined)

let release: (() => void) | null = null

onMounted(() => {
  if (!props.claimed) release = claimToaster()

  // Our own toaster gets an id, so a `<Toaster />` the app's layout already mounts (the
  // starter kits have one) doesn't show every Alfakit toast a second time.
  if (props.toaster) setToasterId(STARTER_KIT_TOASTER_ID)

  ensureFlashToasts(context.registry)
})

onUnmounted(() => {
  release?.()

  if (props.toaster) setToasterId(undefined)
})
</script>

<template>
  <Toaster
    v-if="props.toaster"
    :id="STARTER_KIT_TOASTER_ID"
    :position="resolveToastPosition(props.position, props.dir)"
    :dir="props.dir"
    rich-colors
    close-button
  />
</template>
