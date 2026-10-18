<script lang="ts" module>
  import { lazyLoader } from '../../lib/lazy'

  // The inspector's code loads only on pages that carry `alfakitDevTools`
  // (`Panel::devTools()` with `app.debug` on), never with the panel's entry.
  const loader = lazyLoader<Record<string, never>>(() =>
    import('./DevToolsInspector.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import { useAlfakitProps, useOptionalRegistry } from '../../context.svelte'
  import Lazy from '../../lib/Lazy.svelte'

  /**
   * Where the panel root mounts the schema inspector: nothing unless the page carries
   * `alfakitDevTools`, otherwise the registered `panel:dev-tools` component or the built-in
   * floating button and drawer.
   */
  const registry = useOptionalRegistry()
  const tools = $derived(useAlfakitProps().alfakitDevTools)
  const Custom = $derived(registry?.resolve('panel:dev-tools'))
</script>

{#if tools}
  {#if Custom}
    <Custom />
  {:else}
    <Lazy {loader} props={{}}>
      {#snippet fallback()}{/snippet}
    </Lazy>
  {/if}
{/if}
