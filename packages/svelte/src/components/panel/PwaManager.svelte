<script lang="ts">
  import { applyPwaUpdate, pwaStore, startPwa } from '@alfakit/core'
  import { toast } from 'svelte-sonner'
  import { toastOptions } from '../notifications/toast'
  import { usePanel, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'

  /**
   * `Panel::pwa()`: registers the service worker and offers "Reload" when a new version
   * waits. Renders nothing; effects only run in the browser.
   */
  const t = useT()
  const panel = $derived(usePanel())
  const pwa = $derived(panel?.pwa)
  const state = useStore(pwaStore)

  $effect(() => {
    startPwa(pwa)
  })

  $effect(() => {
    if (!state.current.updateAvailable) return

    toast(
      t('pwa.update_available', {}, 'A new version is available'),
      toastOptions({
        id: 'alfakit-pwa-update',
        duration: Infinity,
        action: { label: t('pwa.reload', {}, 'Reload'), onClick: () => applyPwaUpdate() },
      }),
    )
  })
</script>
