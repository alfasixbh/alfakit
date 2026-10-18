<script lang="ts" generics="P extends Record<string, unknown>">
  import { untrack, type Snippet } from 'svelte'
  import type { LazyLoader } from './lazy'

  let { loader, props, fallback }: { loader: LazyLoader<P>; props: P; fallback: Snippet } = $props()

  // The server render and hydration show the fallback; effects only run in the browser, so
  // the import never starts during SSR. Once loaded, later mounts render straight away.
  let component = $state(untrack(() => loader.current))

  $effect(() => {
    if (component) return

    let active = true
    void loader.load().then((loaded) => {
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
{:else}
  {@render fallback()}
{/if}
