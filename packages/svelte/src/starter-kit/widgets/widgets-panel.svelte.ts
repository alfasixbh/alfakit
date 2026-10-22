import {
  loadStarterKitPanel,
  loadedStarterKitPanel,
  starterKitPanelLocale,
  starterKitWidgetsPanel,
  type PanelSchema,
  type StarterKitWidgets,
} from '@alfakit/core'

/**
 * The panel the loaded components render with, once its data (`widgets.endpoint`) has
 * loaded: null until then. It is loaded per endpoint (a tenant switch) and language (a
 * language switch), so the components follow a switch. Call during component
 * initialisation.
 */
export function useWidgetsPanel(source: () => StarterKitWidgets): {
  readonly current: PanelSchema | null
} {
  let version = $state(0)
  const endpoint = $derived(source().widgets.endpoint)
  const locale = $derived(starterKitPanelLocale(source()))

  $effect(() => {
    let active = true

    void loadStarterKitPanel(endpoint, locale).then(
      () => active && version++,
      () => {},
    )

    return () => {
      active = false
    }
  })

  const panel = $derived.by(() => {
    void version

    const base = loadedStarterKitPanel(endpoint, locale)

    return base ? starterKitWidgetsPanel(base, source()) : null
  })

  return {
    get current() {
      return panel
    },
  }
}
