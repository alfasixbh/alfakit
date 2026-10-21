<script lang="ts">
  import {
    starterKitCopilot,
    takeRequestedStarterKitCopilot,
    type StarterKitWidgets,
  } from '@alfakit/core'
  import AiCopilot from '../../components/ai/AiCopilot.svelte'
  import CopilotTrigger from './CopilotTrigger.svelte'
  import { useWidgetsPanel } from './widgets-panel.svelte'
  import WidgetShell from './WidgetShell.svelte'

  /** The AI copilot (the panel pages' `topbar.end` slot component), once its data has loaded. */
  let { source }: { source: StarterKitWidgets } = $props()

  const panel = useWidgetsPanel(() => source)
  const component = $derived(panel.current ? starterKitCopilot(panel.current) : null)
  // A click or the key bindings before the copilot loaded open it at once.
  let autoOpen: boolean | null = null

  function opensAtOnce(): boolean {
    autoOpen ??= takeRequestedStarterKitCopilot()

    return autoOpen
  }
</script>

{#if panel.current}
  {#if component}
    <WidgetShell panel={panel.current}>
      <AiCopilot {component} autoOpen={opensAtOnce()} />
    </WidgetShell>
  {/if}
{:else}
  <CopilotTrigger {source} />
{/if}
