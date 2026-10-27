<script lang="ts">
  import {
    STARTER_KIT_TOASTER_ID,
    installStarterKitRuntime,
    syncStarterKitPage,
    type AlfakitPageProps,
  } from '@alfakit/core'
  import { page } from '@inertiajs/svelte'
  import { onDestroy, onMount, setContext, type Snippet } from 'svelte'
  import AlfakitRoot from '../AlfakitRoot.svelte'
  import DebugPanelSlot from '../components/panel/DebugPanelSlot.svelte'
  import { setToasterId, showToast } from '../components/notifications/toast'
  import { provideAlfakit, setGlobalAlfakitContext } from '../context.svelte'
  import { APP_MOUNTED, createAppMounted } from '../lib/hydration.svelte'
  import { useStarterKitDocument } from './direction.svelte'
  import { starterKitContext, type StarterKitPageOptions } from './runtime'

  /**
   * The Inertia layout around every Alfakit page in starter kit mode, inside the host layout:
   * Alfakit's context, modals, toasts and the reading direction. It stays mounted while the
   * user moves between Alfakit pages.
   */
  let { options, children }: { options?: StarterKitPageOptions; children?: Snippet } = $props()

  // svelte-ignore state_referenced_locally
  const context = provideAlfakit(starterKitContext(options ?? {}))
  // Lazily loaded parts (split built-ins, icons) render their server markup until this root
  // has hydrated (`AlfakitRoot` marks it mounted), as in a panel app.
  setContext(APP_MOUNTED, createAppMounted())
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

  // `<html lang dir>` of the whole page (the host layout around AlfaKit's content too).
  useStarterKitDocument()

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

<!-- The reading direction and language of Alfakit's content. The document has the same
     direction (`alfakitDocument`), so the host layout around it mirrors too. -->
<div
  data-slot="starter-kit-root"
  dir={pageProps.alfakit?.localization?.direction ?? 'ltr'}
  lang={pageProps.alfakit?.localization?.tag}
  class="contents"
>
  <AlfakitRoot toasterId={STARTER_KIT_TOASTER_ID}>
    {@render children?.()}
    <!-- The debug panel's button lives in AlfaKit's top bar, which a starter kit doesn't
         render: float it in the end corner (nothing without `alfakitDebug`). -->
    <div data-slot="starter-kit-debug-panel" class="fixed end-16 bottom-16 z-40">
      <DebugPanelSlot />
    </div>
  </AlfakitRoot>
</div>
