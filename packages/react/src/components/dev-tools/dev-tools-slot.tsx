import { createElement } from 'react'
import { useAlfakitProps, useOptionalRegistry } from '../../context'
import { lazyComponent } from '../../lib/lazy'

/**
 * The inspector's code loads only on pages that carry `alfakitDevTools` (`Panel::devTools()`
 * with `app.debug` on), so it never ships in the panel's main chunk.
 */
const DevToolsInspector = lazyComponent<Record<string, never>>(
  () => import('./dev-tools-inspector').then((module) => module.DevToolsInspector),
  () => null,
)

/**
 * Where the panel root mounts the schema inspector: nothing unless the page carries
 * `alfakitDevTools`, otherwise the registered `panel:dev-tools` component or the built-in
 * floating button and drawer.
 */
export function DevToolsSlot() {
  const props = useAlfakitProps()
  const registry = useOptionalRegistry()

  if (!props.alfakitDevTools) {
    return null
  }

  return createElement(registry?.resolve('panel:dev-tools') ?? DevToolsInspector)
}
