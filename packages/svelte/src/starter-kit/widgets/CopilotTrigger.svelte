<script lang="ts">
  import {
    registerStarterKitCopilotShortcut,
    requestStarterKitCopilot,
    type StarterKitWidgets,
  } from '@alfakit/core'
  import SparklesIcon from '@lucide/svelte/icons/sparkles'

  /**
   * The AI copilot's button until its code has loaded: the same look, from the shared prop
   * alone. A click and its key bindings (`mod+j`) are remembered and open it once loaded.
   */
  let { source }: { source: StarterKitWidgets } = $props()

  const copilot = $derived(source.widgets.copilot)
  const label = $derived(copilot?.label ?? '')
  const keys = $derived(JSON.stringify(copilot?.keyBindings ?? []))

  $effect(() => registerStarterKitCopilotShortcut(JSON.parse(keys) as string[], label))
</script>

<button
  type="button"
  data-slot="ai-copilot-trigger"
  aria-label={label}
  aria-haspopup="dialog"
  title={label}
  class="hover:bg-accent hover:text-accent-foreground inline-flex size-9 items-center justify-center rounded-md"
  onclick={() => requestStarterKitCopilot()}
>
  <SparklesIcon class="size-4" aria-hidden="true" />
</button>
