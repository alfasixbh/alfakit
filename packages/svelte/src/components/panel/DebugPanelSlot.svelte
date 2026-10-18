<script lang="ts" module>
  import { lazyLoader } from '../../lib/lazy'

  // The drawer's code loads only on pages that carry `alfakitDebug` (`Panel::debugPanel()`
  // with `app.debug` on), never with the panel's entry.
  const loader = lazyLoader<Record<string, never>>(() =>
    import('./DebugPanel.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import { useAlfakitProps, useOptionalRegistry } from '../../context.svelte'
  import Lazy from '../../lib/Lazy.svelte'

  /**
   * Where the top bars put the debug panel: nothing unless the page carries `alfakitDebug`,
   * otherwise the registered `panel:debug-panel` component or the built-in drawer.
   */
  const registry = useOptionalRegistry()
  const debug = $derived(useAlfakitProps().alfakitDebug)
  const Custom = $derived(registry?.resolve('panel:debug-panel'))
</script>

{#if debug}
  {#if Custom}
    <Custom />
  {:else}
    <Lazy {loader} props={{}}>
      {#snippet fallback()}{/snippet}
    </Lazy>
  {/if}
{/if}
