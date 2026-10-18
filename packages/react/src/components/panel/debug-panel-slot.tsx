import { createElement } from 'react'
import { useAlfakitProps, useOptionalRegistry } from '../../context'
import { lazyComponent } from '../../lib/lazy'

// The drawer's code loads only on pages that carry `alfakitDebug` (`Panel::debugPanel()`
// with `app.debug` on), never with the panel's entry.
const DebugPanel = lazyComponent<object>(
  () => import('./debug-panel').then((module) => module.DebugPanel),
  () => null,
)

/**
 * Where the top bars put the debug panel: nothing unless the page carries `alfakitDebug`,
 * otherwise the registered `panel:debug-panel` component or the built-in drawer.
 */
export function DebugPanelSlot() {
  const props = useAlfakitProps()
  const registry = useOptionalRegistry()

  if (!props.alfakitDebug) {
    return null
  }

  return createElement(registry?.resolve('panel:debug-panel') ?? DebugPanel)
}
