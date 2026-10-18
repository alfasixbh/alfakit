<script lang="ts">
  import { useRegistry } from '../../context.svelte'
  import { ensureFlashToasts } from '../../standalone/runtime'

  /**
   * Turns flashed Alfakit notifications into sonner toasts. Mount once. Inertia 3 delivers
   * flash data as `page.flash` (and a `flash` event), not as a page prop, so this shares
   * the listener the standalone toaster uses.
   */
  const registry = useRegistry()

  $effect(() => {
    ensureFlashToasts(registry)
  })
</script>
