import {
  loadStarterKitPanel,
  loadedStarterKitPanel,
  starterKitWidgetsPanel,
  type PanelSchema,
  type StarterKitWidgets,
} from '@alfakit/core'

/**
 * The panel the loaded components render with, once its data (`widgets.endpoint`) has
 * loaded: null until then. A tenant switch (another endpoint) loads its own. Call during
 * component initialisation.
 */
export function useWidgetsPanel(source: () => StarterKitWidgets): {
  readonly current: PanelSchema | null
} {
  let version = $state(0)
  const endpoint = $derived(source().widgets.endpoint)

  $effect(() => {
    let active = true

    void loadStarterKitPanel(endpoint).then(
      () => active && version++,
      () => {},
    )

    return () => {
      active = false
    }
  })

  const panel = $derived.by(() => {
    void version

    const base = loadedStarterKitPanel(endpoint)

    return base ? starterKitWidgetsPanel(base, source()) : null
  })

  return {
    get current() {
      return panel
    },
  }
}
