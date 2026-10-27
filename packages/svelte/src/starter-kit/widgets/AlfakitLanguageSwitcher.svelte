<script lang="ts" module>
  import type { StarterKitWidgets } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The component's code loads once it is mounted in the browser (never during SSR).
  const loader = lazyLoader<{ source: StarterKitWidgets }>(() =>
    import('./loaded').then((module) => module.LoadedLanguageSwitcher),
  )
</script>

<script lang="ts">
  import { starterKitWidgets } from '@alfakit/core'
  import { page } from '@inertiajs/svelte'
  import Lazy from '../../lib/Lazy.svelte'
  import { useStarterKitDocument } from '../direction.svelte'
  import { impersonationBannerLoader } from './banner-loader'
  import LanguageSwitcherTrigger from './LanguageSwitcherTrigger.svelte'

  /**
   * The panel's language menu (`locales()`): the current language straight away, and each
   * language in its own name once loaded. Picking one switches the panel's language (the
   * session, the cookie and `persistLocaleUsing()`) and reloads the page, so AlfaKit pages
   * and the header components show it; the host's own pages and `<html lang dir>` are the
   * app's. Renders nothing for guests or with fewer than two languages.
   */
  let {
    panel,
  }: {
    /** The `starterKit()` panel to use (by default the open AlfaKit page's panel, else the first one that has this component). */ panel?: string
  } = $props()

  const source = $derived(starterKitWidgets(page.props, panel, 'language'))

  // The header is on every page of the app: it keeps `<html lang dir>` in step too.
  useStarterKitDocument()
</script>

<!-- While impersonating, the first header component shows the banner on host pages. -->
{#if source?.widgets.impersonation}
  <Lazy loader={impersonationBannerLoader} props={{ source }}>
    {#snippet fallback()}{/snippet}
  </Lazy>
{/if}

{#if source?.widgets.language}
  {@const value = source}
  <span data-slot="starter-kit-language-switcher" class="inline-flex">
    <Lazy {loader} props={{ source: value }}>
      {#snippet fallback()}
        <LanguageSwitcherTrigger source={value} />
      {/snippet}
    </Lazy>
  </span>
{/if}
