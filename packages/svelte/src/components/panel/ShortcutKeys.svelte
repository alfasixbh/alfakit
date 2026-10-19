<script lang="ts">
  import { shortcutSteps } from '@alfakit/core'
  import { useT } from '../../context.svelte'
  import { useHydrated } from '../../hooks/hydrated.svelte'
  import { cn } from '../../lib/utils'

  /**
   * A key binding as `<kbd>` keys (`G` then `D`, `⌘K`). The keys depend on the visitor's
   * platform (⌘ or Ctrl), so they render after hydration.
   */
  let { binding, class: className }: { binding: string; class?: string } = $props()

  const t = useT()
  const hydrated = useHydrated()
  const steps = $derived(shortcutSteps(binding))
</script>

{#if hydrated.current}
  <span data-slot="shortcut-keys" class={cn('inline-flex items-center gap-1', className)}>
    {#each steps as step, index (index)}
      <span class="inline-flex items-center gap-1">
        {#if index > 0}<span class="text-muted-foreground text-[10px]"
            >{t('shortcuts.then', {}, 'then')}</span
          >{/if}
        <kbd
          dir="ltr"
          class="bg-muted text-muted-foreground rounded border px-1.5 font-mono text-[10px] leading-5"
          >{step}</kbd
        >
      </span>
    {/each}
  </span>
{/if}
