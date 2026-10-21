import type { AnyComponent } from '../context'
import { AppLayout } from './app-layout'
import { AuthLayout } from './auth-layout'
import { BlankLayout } from './blank-layout'
import { FullscreenLayout } from './fullscreen-layout'

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
