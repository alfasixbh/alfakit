<script lang="ts">
  import { resolveToastPosition, STARTER_KIT_TOASTER_ID, type ToastPosition } from '@alfakit/core'
  import { onMount } from 'svelte'
  import { setToasterId } from '../components/notifications/toast'
  import { Toaster } from '../components/ui/sonner'
  import { useOptionalAlfakit } from '../context.svelte'
  import { claimToaster, createStandaloneContext, ensureFlashToasts } from './runtime'

  /**
   * Shows notifications flashed by standalone components (`Notification::make()->send()`
   * from `submit()` or an action) as toasts. Place it once in your app layout; a page whose
   * layout has none gets one from its first `<AlfakitComponent>`.
   *
   * Flash data comes from the `flash` Inertia event after each visit and from the initial
   * page (already fired before the app mounted), so it works in any layout.
   */
  let {
    position,
    dir = 'ltr',
    toaster = true,
    claimed = false,
  }: {
    /** Where toasts appear; `start`/`end` follow the reading direction. */
    position?: ToastPosition
    dir?: 'ltr' | 'rtl'
    /**
     * Render svelte-sonner's `<Toaster>` too (default). Pass `false` when your layout already
     * mounts one: flashed Alfakit notifications are then shown through it.
     */
    toaster?: boolean
    /** @internal Set by `<AlfakitComponent>` when it takes the toaster role. */
    claimed?: boolean
  } = $props()

  // Outside <AlfakitComponent> the flash reader needs a registry for custom toast views.
  const context =
    useOptionalAlfakit() ?? createStandaloneContext({ action: '', modal: '' }, undefined, undefined)

  onMount(() => {
    const release = claimed ? null : claimToaster()

    ensureFlashToasts(context.registry)

    // Our own toaster gets an id, so a `<Toaster />` the app's layout already mounts (the
    // starter kits have one) doesn't show every Alfakit toast a second time.
    if (toaster) setToasterId(STARTER_KIT_TOASTER_ID)

    return () => {
      release?.()

      if (toaster) setToasterId(undefined)
    }
  })
</script>

{#if toaster}
  <Toaster
    id={STARTER_KIT_TOASTER_ID}
    position={resolveToastPosition(position, dir)}
    {dir}
    richColors
    closeButton
  />
{/if}
