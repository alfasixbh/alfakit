<script lang="ts">
  import {
    applyDocumentLocale,
    applyPanelTheme,
    PANEL_TOAST_OFFSET,
    resolveToastPosition,
    type AlfakitPageProps,
  } from '@alfakit/core'
  import { page } from '@inertiajs/svelte'
  import type { Snippet } from 'svelte'
  import ActionModals from './components/actions/ActionModals.svelte'
  import DevToolsSlot from './components/dev-tools/DevToolsSlot.svelte'
  import FlashToasts from './components/notifications/FlashToasts.svelte'
  import RealtimeNotifications from './components/notifications/RealtimeNotifications.svelte'
  import ImpersonationBanner from './components/panel/ImpersonationBanner.svelte'
  import PwaManager from './components/panel/PwaManager.svelte'
  import SchemaContractGuard from './components/panel/SchemaContractGuard.svelte'
  import { Toaster } from './components/ui/sonner'
  import { TooltipProvider } from './components/ui/tooltip'
  import { useAlfakit } from './context.svelte'

  // Starter kit mode: Alfakit's toaster gets an id so the host's id-less one never doubles its toasts.
  let { children, toasterId }: { children?: Snippet; toasterId?: string } = $props()

  const { translator, registry } = useAlfakit()

  // Replace with createAlfakit({ components: { 'panel:impersonation-banner': … } }).
  const Banner = (registry.resolve('panel:impersonation-banner') ??
    ImpersonationBanner) as typeof ImpersonationBanner

  const panel = $derived((page.props as unknown as Partial<AlfakitPageProps>).alfakit)
  const localization = $derived(panel?.localization)
  const direction = $derived(localization?.direction ?? 'ltr')

  // Every visit (including the redirect after a language switch) may carry new strings, so
  // the translator is updated while this layout renders: the markup reads `locale` before
  // rendering children, which therefore see the new strings on the same update.
  const locale = $derived.by(() => {
    if (panel) {
      translator.setTranslations(panel.translations ?? {})
      translator.setLocale(localization?.tag ?? 'en')
    }

    return localization?.tag ?? 'en'
  })

  $effect.pre(() => {
    applyDocumentLocale(localization)
  })

  $effect.pre(() => {
    if (panel) applyPanelTheme(panel)
  })
</script>

<!-- Rendered as the Inertia layout so modals and toasts live inside the page tree and can read page props. -->
<TooltipProvider delayDuration={0}>
  {#key locale}
    <SchemaContractGuard {panel}>
      {@render children?.()}
    </SchemaContractGuard>
  {/key}
  <ActionModals />
  <FlashToasts />
  <RealtimeNotifications />
  <!-- `Panel::pwa()`: service worker and the "new version" toast. -->
  <PwaManager />
  <!-- Schema inspector: renders (and loads its code) only with `alfakitDevTools`. -->
  <DevToolsSlot />
  {#if panel?.impersonation}
    <Banner impersonation={panel.impersonation} />
  {/if}
  <Toaster
    id={toasterId}
    position={resolveToastPosition(panel?.toastPosition, direction)}
    offset={PANEL_TOAST_OFFSET}
    mobileOffset={PANEL_TOAST_OFFSET}
    dir={direction}
    richColors
    closeButton
  />
</TooltipProvider>
