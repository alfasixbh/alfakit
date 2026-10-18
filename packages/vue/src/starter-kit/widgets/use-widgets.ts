import {
  ActionRunner,
  ComponentRegistry,
  Translator,
  loadStarterKitPanel,
  loadedStarterKitPanel,
  starterKitWidgetsPanel,
  type PanelSchema,
  type StarterKitWidgets,
} from '@alfakit/core'
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { AlfakitContextValue, AnyComponent } from '../../context'

// The loaded components' panel and context; `./index` (the eager triggers) must not import
// this module, which pulls in the action runner.

/**
 * The panel the loaded components render with, once its data (`widgets.endpoint`) has
 * loaded: null until then. A tenant switch (another endpoint) loads its own.
 */
export function useWidgetsPanel(source: Ref<StarterKitWidgets>): ComputedRef<PanelSchema | null> {
  const version = ref(0)

  watch(
    () => source.value.widgets.endpoint,
    (endpoint, _old, onCleanup) => {
      let active = true

      onCleanup(() => (active = false))

      void loadStarterKitPanel(endpoint).then(
        () => active && version.value++,
        () => {},
      )
    },
    { immediate: true },
  )

  return computed(() => {
    void version.value

    const base = loadedStarterKitPanel(source.value.widgets.endpoint)

    return base ? starterKitWidgetsPanel(base, source.value) : null
  })
}

// One context for the browser session: its own translator (the panel's strings), an empty
// registry (only `panel:icon` overrides are looked up here) and an idle action runner.
let widgetsContext: AlfakitContextValue | null = null

/** @internal The context of the loaded header components (browser only). */
export function widgetsAlfakitContext(): AlfakitContextValue {
  widgetsContext ??= {
    registry: new ComponentRegistry<AnyComponent>(),
    pages: {},
    translator: new Translator(),
    actions: new ActionRunner({ endpoints: { action: '', modal: '' } }),
  }

  return widgetsContext
}
