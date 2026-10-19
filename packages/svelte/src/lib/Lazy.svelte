<script lang="ts" generics="P extends Record<string, unknown>">
  import { untrack, type Snippet } from 'svelte'
  import { useAppMounted } from './hydration.svelte'
  import type { LazyLoader } from './lazy'

  let { loader, props, fallback }: { loader: LazyLoader<P>; props: P; fallback: Snippet } = $props()

  // The server render and hydration show the fallback (also when another app on the page
  // already loaded the component); effects only run in the browser, so the import never
  // starts during SSR. Once the app has mounted, later mounts render straight away.
  const mounted = useAppMounted()
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

{#if component && mounted.current}
  {@const Loaded = component}
  <Loaded {...props} />
{:else}
  {@render fallback()}
{/if}
