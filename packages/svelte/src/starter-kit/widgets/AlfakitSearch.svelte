<script lang="ts" module>
  import type { StarterKitWidgets } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The component's code loads once it is mounted in the browser (never during SSR).
  const loader = lazyLoader<{ source: StarterKitWidgets }>(() =>
    import('./LoadedSearch.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import { starterKitWidgets } from '@alfakit/core'
  import { page } from '@inertiajs/svelte'
  import Lazy from '../../lib/Lazy.svelte'
  import SearchTrigger from './SearchTrigger.svelte'

  /**
   * AlfaKit's command palette and global search: the search field opens it, and so do the
   * panel's key bindings (⌘K / Ctrl+K by default), registered once for the page. Renders
   * nothing for guests or without global search and a command palette.
   */
  let {
    panel,
  }: { /** The `starterKit()` panel to use (the first one by default). */ panel?: string } =
    $props()

  const source = $derived(starterKitWidgets(page.props, panel))
</script>

{#if source?.widgets.search}
  {@const value = source}
  <span data-slot="starter-kit-search" class="inline-flex">
    <Lazy {loader} props={{ source: value }}>
      {#snippet fallback()}
        <SearchTrigger source={value} />
      {/snippet}
    </Lazy>
  </span>
{/if}
