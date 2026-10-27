<script lang="ts">
  import {
    applyDocumentLocale,
    applyPanelTheme,
    setIconAliases,
    PANEL_TOAST_OFFSET,
    resolveToastPosition,
    overlayPlacementDirection,
    type AlfakitPageProps,
  } from '@alfakit/core'
  import { page } from '@inertiajs/svelte'
  import { onMount, type Snippet } from 'svelte'
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
  import { markAppMounted } from './lib/hydration.svelte'
  import PanelLayoutHost from './pages/PanelLayoutHost.svelte'
  import { claimToaster } from './standalone/toaster-claims'

  // Starter kit mode: Alfakit's toaster gets an id so the host's id-less one never doubles its toasts.
  let { children, toasterId }: { children?: Snippet; toasterId?: string } = $props()

  const { translator, registry } = useAlfakit()

  markAppMounted()

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
      // Chrome icons replaced with `Icons::register()`, also in a server render, so the server
      // and the browser draw the same glyph (W-V3-28).
      setIconAliases(panel.theme?.icons)
    }

    return localization?.tag ?? 'en'
  })

  // Starter kit mode: the host app owns `<html lang dir>` (its own pages and layout are not
  // mirrored); `AlfakitStarterKitRoot` puts the direction on Alfakit's own root element.
  $effect.pre(() => {
    if (panel?.starterKit !== true) applyDocumentLocale(localization)
  })

  $effect.pre(() => {
    if (panel) applyPanelTheme(panel)
  })

  // This root renders the toaster: starter kit header components and standalone components
  // on the same page don't mount a second one.
  onMount(() => claimToaster())
</script>

<!-- Rendered as the Inertia layout so modals and toasts live inside the page tree and can read page props. -->
<TooltipProvider delayDuration={0}>
  {#key locale}
    <SchemaContractGuard {panel}>
      <!-- The panel layout stays mounted across visits between Alfakit pages. -->
      <PanelLayoutHost>{@render children?.()}</PanelLayoutHost>
    </SchemaContractGuard>
    <!-- Inside the key like the page, so their texts follow a language switch. -->
    <!-- Schema inspector: renders (and loads its code) only with `alfakitDevTools`. -->
    <DevToolsSlot />
    {#if panel?.impersonation}
      <Banner impersonation={panel.impersonation} />
    {/if}
  {/key}
  <ActionModals />
  <FlashToasts />
  <RealtimeNotifications />
  <!-- `Panel::pwa()`: service worker and the "new version" toast. -->
  <PwaManager />
  <Toaster
    id={toasterId}
    position={resolveToastPosition(
      panel?.toastPosition,
      overlayPlacementDirection(direction, panel?.starterKit),
    )}
    offset={PANEL_TOAST_OFFSET}
    mobileOffset={PANEL_TOAST_OFFSET}
    dir={direction}
    richColors
    closeButton
  />
</TooltipProvider>
