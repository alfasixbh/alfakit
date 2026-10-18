import { ActionRunner, ComponentRegistry, Translator } from '@alfakit/core'
import type { AlfakitContextValue, AnyComponent } from '../../context.svelte'

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
