<script lang="ts">
  import { isAlfakitPage, type StarterKitWidgets } from '@alfakit/core'
  import { page } from '@inertiajs/svelte'
  import NotificationsMenu from '../../components/notifications/NotificationsMenu.svelte'
  import RealtimeNotifications from '../../components/notifications/RealtimeNotifications.svelte'
  import NotificationsTrigger from './NotificationsTrigger.svelte'
  import { useWidgetsPanel } from './widgets-panel.svelte'
  import WidgetShell from './WidgetShell.svelte'

  /** The notifications bell, with realtime notifications on the host's own pages. */
  let { source }: { source: StarterKitWidgets } = $props()

  const panel = useWidgetsPanel(() => source)
  // Alfakit pages subscribe to realtime notifications themselves.
  const alfakitPage = $derived(isAlfakitPage(page.props))
</script>

{#if panel.current}
  <WidgetShell panel={panel.current}>
    <NotificationsMenu />
    {#if !alfakitPage}
      <RealtimeNotifications />
    {/if}
  </WidgetShell>
{:else}
  <NotificationsTrigger {source} />
{/if}
