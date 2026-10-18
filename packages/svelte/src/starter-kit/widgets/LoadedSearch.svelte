<script lang="ts">
  import { openRequestedStarterKitSearch, type StarterKitWidgets } from '@alfakit/core'
  import { tick } from 'svelte'
  import GlobalSearch from '../../components/panel/GlobalSearch.svelte'
  import SearchTrigger from './SearchTrigger.svelte'
  import { useWidgetsPanel } from './widgets-panel.svelte'
  import WidgetShell from './WidgetShell.svelte'

  /** The panel's command palette and global search, once its data has loaded. */
  let { source }: { source: StarterKitWidgets } = $props()

  const panel = useWidgetsPanel(() => source)
  const ready = $derived(panel.current !== null)

  // A click or the key bindings before the palette loaded open it once it mounted.
  $effect(() => {
    if (ready) void tick().then(() => openRequestedStarterKitSearch())
  })
</script>

{#if panel.current}
  <WidgetShell panel={panel.current}>
    <GlobalSearch />
  </WidgetShell>
{:else}
  <SearchTrigger {source} />
{/if}
