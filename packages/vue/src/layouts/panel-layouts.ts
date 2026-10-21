import type { AnyComponent } from '../context'
import AppLayout from './AppLayout.vue'
import AuthLayout from './AuthLayout.vue'
import BlankLayout from './BlankLayout.vue'
import FullscreenLayout from './FullscreenLayout.vue'

/**
 * The panel's own layouts (sidebar or top navigation, auth card, blank, fullscreen), which
 * `createAlfakit()` registers up front. Starter kit pages render in the host's layout and
 * never import these: `PageShell` loads one on demand if such a page asks for it.
 */
export const panelLayouts: Record<string, AnyComponent> = {
  'layout:app': AppLayout,
  'layout:auth': AuthLayout,
  'layout:blank': BlankLayout,
  'layout:fullscreen': FullscreenLayout,
}
