<script lang="ts">
  import { starterKitWidgetsPage, type PanelSchema } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import { TooltipProvider } from '../../components/ui/tooltip'
  import { provideAlfakit, provideStandalone } from '../../context.svelte'
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
</script>

<TooltipProvider delayDuration={0}>
  {#key ready}
    {@render children?.()}
  {/key}
</TooltipProvider>
