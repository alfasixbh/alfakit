<script lang="ts">
  import { canInstallPwa, pwaStore, subscribeToPush, unsubscribeFromPush } from '@alfakit/core'
  import BellIcon from '@lucide/svelte/icons/bell'
  import BellOffIcon from '@lucide/svelte/icons/bell-off'
  import DownloadIcon from '@lucide/svelte/icons/download'
  import { toast } from 'svelte-sonner'
  import { toastOptions } from '../notifications/toast'
  import { usePanel, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { DropdownMenuItem } from '../ui/dropdown-menu'
  import { installPwa } from './pwa'

  /** User menu entries: "Install app" and turning Web Push on or off for this browser. */
  const t = useT()
  const panel = $derived(usePanel())
  const state = useStore(pwaStore)

  const installable = $derived(Boolean(panel?.pwa) && canInstallPwa(state.current))
  const push = $derived(Boolean(panel?.pwa?.push) && state.current.push !== 'unsupported')

  async function togglePush() {
    const outcome =
      state.current.push === 'subscribed' ? await unsubscribeFromPush() : await subscribeToPush()

    if (outcome === 'subscribed') {
      toast.success(
        t('pwa.notifications.enabled', {}, 'Notifications are on for this device'),
        toastOptions(),
      )
    } else if (outcome === 'unsubscribed') {
      toast.success(
        t('pwa.notifications.disabled', {}, 'Notifications are off for this device'),
        toastOptions(),
      )
    } else if (outcome === 'denied') {
      toast.error(
        t('pwa.notifications.blocked', {}, 'Notifications are blocked in your browser settings'),
        toastOptions(),
      )
    } else {
      toast.error(
        t('pwa.notifications.failed', {}, 'Couldn’t change notifications. Try again.'),
        toastOptions(),
      )
    }
  }
</script>

{#if installable}
  <DropdownMenuItem data-slot="pwa-install" onSelect={() => void installPwa(t)}>
    <Icon name="alfakit::panels.user-menu.install-app-item" fallback={DownloadIcon} />
    {t('pwa.install', {}, 'Install app')}
  </DropdownMenuItem>
{/if}
{#if push}
  <DropdownMenuItem
    data-slot="pwa-push"
    disabled={state.current.pushBusy || state.current.push === 'denied'}
    onSelect={() => void togglePush()}
  >
    {#if state.current.push === 'subscribed'}
      <Icon name="alfakit::panels.user-menu.push-off-item" fallback={BellOffIcon} />
      {t('pwa.notifications.disable', {}, 'Turn off notifications')}
    {:else}
      <Icon name="alfakit::panels.user-menu.push-on-item" fallback={BellIcon} />
      {t('pwa.notifications.enable', {}, 'Turn on notifications')}
    {/if}
  </DropdownMenuItem>
{/if}
