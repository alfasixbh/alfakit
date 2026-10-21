<script lang="ts" module>
  import type { CopilotController } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The chat slide-over; its code loads the first time the copilot opens.
  const loader = lazyLoader<{ controller: CopilotController }>(() =>
    import('./CopilotPanel.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import { type AiCopilotSchema, CopilotController as Controller, shortcuts } from '@alfakit/core'
  import SparklesIcon from '@lucide/svelte/icons/sparkles'
  import { onDestroy, untrack } from 'svelte'
  import { useT } from '../../context.svelte'
  import Lazy from '../../lib/Lazy.svelte'
  import { Button } from '../ui/button'

  /**
   * The copilot of alfasix/alfakit-ai (`ai:copilot`): a topbar button (and `mod+j`) opening
   * a chat slide-over. Questions, tools and actions run on the server; proposed actions
   * run only when the user confirms them in the chat.
   */
  let {
    component,
    autoOpen = false,
  }: {
    component: AiCopilotSchema
    /** Open once mounted (starter kit header: clicked or `mod+j` before its code loaded). */
    autoOpen?: boolean
  } = $props()
  const t = useT()
  // One controller per panel: Inertia visits pass new props objects.
  const controller = new Controller(untrack(() => component))
  let open = $state(controller.state.open)
  let mounted = $state(false)
  const label = $derived(t('ai.open', {}, 'Open AI copilot'))
  const keys = $derived(JSON.stringify(component.keyBindings ?? []))

  const unsubscribe = controller.subscribe((next) => {
    open = next.open

    if (next.open) mounted = true
  })

  onDestroy(unsubscribe)

  if (untrack(() => autoOpen && component.canUse !== false)) controller.open()

  $effect(() => {
    const bindings = JSON.parse(keys) as string[]

    if (bindings.length === 0) return

    return shortcuts.register({
      id: 'ai.copilot',
      keys: bindings,
      label,
      group: 'general',
      allowInInputs: true,
      handler: () => controller.toggle(),
    })
  })
</script>

{#if component.canUse !== false}
  <div data-slot="ai-copilot" class="contents">
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-slot="ai-copilot-trigger"
      aria-label={label}
      aria-expanded={open}
      aria-haspopup="dialog"
      title={label}
      onclick={() => controller.open()}
      onpointerenter={() => void loader.load()}
      onfocus={() => void loader.load()}
    >
      <SparklesIcon aria-hidden="true" />
    </Button>
    {#if mounted}
      <Lazy {loader} props={{ controller }}>
        {#snippet fallback()}{/snippet}
      </Lazy>
    {/if}
  </div>
{/if}
