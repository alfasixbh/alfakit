<script lang="ts">
  import type { DiscoveredEntry } from '@alfakit/core'
  import { untrack } from 'svelte'
  import type { AnyComponent } from '../context.svelte'

  /**
   * An auto-registered component (`createAlfakit({ discover })`). Pages preload the ones they
   * use, so it usually renders straight away (also during SSR and hydration); otherwise its
   * code loads in the browser first.
   */
  let { entry, props }: { entry: DiscoveredEntry<AnyComponent>; props: Record<string, unknown> } =
    $props()

  let component = $state(untrack(() => entry.current))

  $effect(() => {
    if (component) return

    let active = true
    void entry.load().then((loaded) => {
      if (active) component = loaded
    })

    return () => {
      active = false
    }
  })
</script>

{#if component}
  {@const Loaded = component}
  <Loaded {...props} />
{/if}
