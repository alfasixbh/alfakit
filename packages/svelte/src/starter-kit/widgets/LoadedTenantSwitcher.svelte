<script lang="ts">
  import type { StarterKitWidgets } from '@alfakit/core'
  import TenantMenu from '../../components/panel/TenantMenu.svelte'
  import TenantChooser from './TenantChooser.svelte'
  import TenantSwitcherTrigger from './TenantSwitcherTrigger.svelte'
  import { useWidgetsPanel } from './widgets-panel.svelte'
  import WidgetShell from './WidgetShell.svelte'

  /** The panel's tenant menu inside a tenant, a menu to choose one elsewhere. */
  let { source }: { source: StarterKitWidgets } = $props()

  const panel = useWidgetsPanel(() => source)
</script>

{#if panel.current}
  <WidgetShell panel={panel.current}>
    {#if panel.current.tenancy?.current}
      <TenantMenu variant="topbar" />
    {:else}
      <TenantChooser />
    {/if}
  </WidgetShell>
{:else}
  <TenantSwitcherTrigger {source} />
{/if}
