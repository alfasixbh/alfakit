<script lang="ts" module>
  import type { StarterKitWidgets } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The component's code loads once it is mounted in the browser (never during SSR).
  const loader = lazyLoader<{ source: StarterKitWidgets }>(() =>
    import('./LoadedTenantSwitcher.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import { starterKitWidgets } from '@alfakit/core'
  import { page } from '@inertiajs/svelte'
  import Lazy from '../../lib/Lazy.svelte'
  import TenantSwitcherTrigger from './TenantSwitcherTrigger.svelte'

  /**
   * The tenant switcher of a tenancy panel: the current tenant inside the panel, or a menu
   * to choose one on the host's own pages. Renders nothing for guests or other panels.
   */
  let {
    panel,
  }: { /** The `starterKit()` panel to use (the first one by default). */ panel?: string } =
    $props()

  const source = $derived(starterKitWidgets(page.props, panel))
</script>

{#if source?.widgets.tenancy}
  {@const value = source}
  <span data-slot="starter-kit-tenant-switcher" class="inline-flex">
    <Lazy {loader} props={{ source: value }}>
      {#snippet fallback()}
        <TenantSwitcherTrigger source={value} />
      {/snippet}
    </Lazy>
  </span>
{/if}
