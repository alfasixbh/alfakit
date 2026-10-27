<script lang="ts" module>
  import type { StarterKitWidgets } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The component's code loads once it is mounted in the browser (never during SSR).
  const loader = lazyLoader<{ source: StarterKitWidgets }>(() =>
    import('./loaded').then((module) => module.LoadedNotifications),
  )
</script>

<script lang="ts">
  import { starterKitWidgets } from '@alfakit/core'
  import { page } from '@inertiajs/svelte'
  import Lazy from '../../lib/Lazy.svelte'
  import { useStarterKitDocument } from '../direction.svelte'
  import { impersonationBannerLoader } from './banner-loader'
  import NotificationsTrigger from './NotificationsTrigger.svelte'

  /**
   * The bell with the user's database notifications (`databaseNotifications()`), polling and
   * realtime updates as in the panel. Renders nothing for guests or without them.
   */
  let {
    panel,
  }: {
    /** The `starterKit()` panel to use (by default the open AlfaKit page's panel, else the first one that has this component). */ panel?: string
  } = $props()

  const source = $derived(starterKitWidgets(page.props, panel, 'notifications'))

  // The header is on every page of the app: it keeps `<html lang dir>` in step too.
  useStarterKitDocument()
</script>

<!-- While impersonating, the first header component shows the banner on host pages. -->
{#if source?.widgets.impersonation}
  <Lazy loader={impersonationBannerLoader} props={{ source }}>
    {#snippet fallback()}{/snippet}
  </Lazy>
{/if}

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
