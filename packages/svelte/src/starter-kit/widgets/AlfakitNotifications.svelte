<script lang="ts" module>
  import type { StarterKitWidgets } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The component's code loads once it is mounted in the browser (never during SSR).
  const loader = lazyLoader<{ source: StarterKitWidgets }>(() =>
    import('./LoadedNotifications.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import { starterKitWidgets } from '@alfakit/core'
  import { page } from '@inertiajs/svelte'
  import Lazy from '../../lib/Lazy.svelte'
  import NotificationsTrigger from './NotificationsTrigger.svelte'

  /**
   * The bell with the user's database notifications (`databaseNotifications()`), polling and
   * realtime updates as in the panel. Renders nothing for guests or without them.
   */
  let {
    panel,
  }: { /** The `starterKit()` panel to use (the first one by default). */ panel?: string } =
    $props()

  const source = $derived(starterKitWidgets(page.props, panel))
</script>

{#if source?.widgets.notifications}
  {@const value = source}
  <span data-slot="starter-kit-notifications" class="inline-flex">
    <Lazy {loader} props={{ source: value }}>
      {#snippet fallback()}
        <NotificationsTrigger source={value} />
      {/snippet}
    </Lazy>
  </span>
{/if}
