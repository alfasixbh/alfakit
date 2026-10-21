<script lang="ts" module>
  import type { StarterKitWidgets } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The component's code loads once it is mounted in the browser (never during SSR).
  const loader = lazyLoader<{ source: StarterKitWidgets }>(() =>
    import('./loaded').then((module) => module.LoadedCopilot),
  )
</script>

<script lang="ts">
  import { starterKitWidgets } from '@alfakit/core'
  import { page } from '@inertiajs/svelte'
  import Lazy from '../../lib/Lazy.svelte'
  import { impersonationBannerLoader } from './banner-loader'
  import CopilotTrigger from './CopilotTrigger.svelte'

  /**
   * The AI copilot of alfasix/alfakit-ai (`AiPlugin::copilot()`): its button and chat
   * slide-over, opened with its key bindings (`mod+j`) from any page. Renders nothing for
   * guests, without the plugin's copilot, for users who may not use it and (tenancy
   * panels) outside a tenant.
   */
  let {
    panel,
  }: {
    /** The `starterKit()` panel to use (by default the open AlfaKit page's panel, else the first one that has this component). */ panel?: string
  } = $props()

  const source = $derived(starterKitWidgets(page.props, panel, 'copilot'))
</script>

<!-- While impersonating, the first header component shows the banner on host pages. -->
{#if source?.widgets.impersonation}
  <Lazy loader={impersonationBannerLoader} props={{ source }}>
    {#snippet fallback()}{/snippet}
  </Lazy>
{/if}

{#if source?.widgets.copilot}
  {@const value = source}
  <span data-slot="starter-kit-copilot" class="inline-flex">
    <Lazy {loader} props={{ source: value }}>
      {#snippet fallback()}
        <CopilotTrigger source={value} />
      {/snippet}
    </Lazy>
  </span>
{/if}
