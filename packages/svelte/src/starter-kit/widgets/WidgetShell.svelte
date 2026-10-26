<script lang="ts">
  import {
    isAlfakitPage,
    overlayPlacementDirection,
    resolveToastPosition,
    STARTER_KIT_TOASTER_ID,
    starterKitWidgetsPage,
    type PanelSchema,
  } from '@alfakit/core'
  import { page as inertiaPage } from '@inertiajs/svelte'
  import { Portal } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import { setToasterId } from '../../components/notifications/toast'
  import { Toaster } from '../../components/ui/sonner'
  import { TooltipProvider } from '../../components/ui/tooltip'
  import { provideAlfakit, provideStandalone } from '../../context.svelte'
  import { ensureFlashToasts } from '../../standalone/runtime'
  import { claimToaster, hasToaster } from '../../standalone/toaster-claims'
  import { widgetsAlfakitContext } from './context'

  /**
   * The context of a loaded header component: the panel data as the `alfakit` prop of a
   * panel page (`usePanel()`) and the panel's translations.
   */
  let { panel, children }: { panel: PanelSchema; children?: Snippet } = $props()

  const context = provideAlfakit(widgetsAlfakitContext())
  const page = starterKitWidgetsPage()

  provideStandalone({
    get panel() {
      return panel
    },
    get page() {
      return page
    },
  })

  // The strings are updated while rendering, so children see them on the same update.
  const ready = $derived.by(() => {
    context.translator.setTranslations(panel.translations ?? {})
    context.translator.setLocale(panel.localization?.tag ?? 'en')

    return panel.localization?.tag ?? 'en'
  })

  /**
   * On the host's own pages no AlfaKit toaster is mounted, so the first loaded header
   * component renders one: the push toggle's and the PWA's messages show there too (W-S1-03).
   * AlfaKit pages (`AlfakitRoot`) and standalone components claim it themselves; the check
   * runs after every component mounted, and again after each visit.
   */
  const alfakitPage = $derived(isAlfakitPage(inertiaPage.props))
  let ownsToaster = $state(false)

  $effect(() => {
    if (alfakitPage) return

    let release: (() => void) | null = null
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled || hasToaster()) return

      release = claimToaster()
      ownsToaster = true
      // As `<AlfakitToaster>`: Alfakit's toasts and flashed notifications go to this one.
      setToasterId(STARTER_KIT_TOASTER_ID)
      ensureFlashToasts(context.registry)
    })

    return () => {
      cancelled = true

      if (release) {
        release()
        setToasterId(undefined)
      }

      ownsToaster = false
    }
  })

  const placement = $derived(
    overlayPlacementDirection(panel.localization?.direction ?? 'ltr', true),
  )
</script>

<TooltipProvider delayDuration={0}>
  {#key ready}
    {@render children?.()}
  {/key}
</TooltipProvider>
<!-- In the body, not in the header (a header with a backdrop filter would hold its fixed
     position), placed in the document's direction as on AlfaKit pages. -->
{#if ownsToaster && !alfakitPage}
  <Portal>
    <Toaster
      id={STARTER_KIT_TOASTER_ID}
      position={resolveToastPosition(panel.toastPosition, placement)}
      dir={placement}
      richColors
      closeButton
    />
  </Portal>
{/if}
