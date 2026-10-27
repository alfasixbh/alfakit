<script lang="ts">
  import type { DiscoveredEntry } from '@alfakit/core'
  import { untrack } from 'svelte'
  import { useOptionalAlfakit, type AnyComponent } from '../context.svelte'
  import { useAppMounted } from './hydration.svelte'

  /**
   * An auto-registered component (`createAlfakit({ discover })`) or a split built-in. Pages
   * preload the ones they use, so it usually renders straight away (also during SSR and
   * hydration); otherwise its code loads in the browser first.
   *
   * Where pages are not preloaded (starter kits, standalone components), the server render
   * and hydration leave it out even when its code is loaded: a long-lived SSR server keeps
   * what earlier requests loaded, a fresh browser has none of it (OM-B06).
   */
  let { entry, props }: { entry: DiscoveredEntry<AnyComponent>; props: Record<string, unknown> } =
    $props()

  const preloaded = useOptionalAlfakit()?.preloadsPageComponents === true
  const mounted = useAppMounted()
  const ready = $derived(preloaded || mounted.current)

  let loaded = $state(untrack(() => (ready ? entry.current : undefined)))
  const component = $derived(loaded ?? (ready ? entry.current : undefined))

  $effect(() => {
    if (component) return

    let active = true
    void entry.load().then((resolved) => {
      if (active) loaded = resolved
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
