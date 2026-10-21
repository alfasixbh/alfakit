<script lang="ts">
  import {
    STARTER_KIT_TOASTER_ID,
    installStarterKitRuntime,
    syncStarterKitPage,
    type AlfakitPageProps,
  } from '@alfakit/core'
  import { page } from '@inertiajs/svelte'
  import { onDestroy, onMount, type Snippet } from 'svelte'
  import AlfakitRoot from '../AlfakitRoot.svelte'
  import { setToasterId, showToast } from '../components/notifications/toast'
  import { provideAlfakit, setGlobalAlfakitContext } from '../context.svelte'
  import { starterKitContext, type StarterKitPageOptions } from './runtime'

  /**
   * The Inertia layout around every Alfakit page in starter kit mode, inside the host layout:
   * Alfakit's context, modals, toasts and the reading direction. It stays mounted while the
   * user moves between Alfakit pages.
   */
  let { options, children }: { options?: StarterKitPageOptions; children?: Snippet } = $props()

  // svelte-ignore state_referenced_locally
  const context = provideAlfakit(starterKitContext(options ?? {}))
  const pageProps = $derived(page.props as unknown as Partial<AlfakitPageProps>)

  // Endpoints follow the open page (before children run actions).
  $effect.pre(() => {
    const endpoints = pageProps.alfakit?.endpoints

    if (endpoints) {
      context.actions.setEndpoints({ action: endpoints.action ?? '', modal: endpoints.modal ?? '' })
    }
  })

  $effect(() => {
    syncStarterKitPage(pageProps)
  })

  onMount(() => {
    // Toasts and other content rendered outside the component tree find the context too.
    setGlobalAlfakitContext(context)
    installStarterKitRuntime(
      (notification) => showToast(notification),
      (key, replacements, fallback) => context.translator.t(key, replacements, fallback),
    )
    setToasterId(STARTER_KIT_TOASTER_ID)
  })

  onDestroy(() => {
    if (typeof window === 'undefined') return

    // A host page is open: its errors and toasts are the host's again.
    syncStarterKitPage(null)
    setToasterId(undefined)
  })
</script>

<!-- The reading direction and language of Alfakit's content only: the host layout around it
     (sidebar, header) and the app's own pages keep the document's. -->
<div
  data-slot="starter-kit-root"
  dir={pageProps.alfakit?.localization?.direction ?? 'ltr'}
  lang={pageProps.alfakit?.localization?.tag}
  class="contents"
>
  <AlfakitRoot toasterId={STARTER_KIT_TOASTER_ID}>
    {@render children?.()}
  </AlfakitRoot>
</div>
