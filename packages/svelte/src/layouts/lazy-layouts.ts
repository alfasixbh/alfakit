import { lazyComponents } from '@alfakit/core'
import type { AnyComponent } from '../context.svelte'
import { discoveredComponent } from '../lib/discovery'

/**
 * The fullscreen layout (`$layout = 'fullscreen'`), loaded on demand by starter kit pages:
 * they render in the host's layout, so the page chunk never imports the panel's header,
 * menus and notifications for a layout few pages use. Only the starter kit registers it;
 * `createAlfakit()` registers the layouts themselves up front (`panelLayouts`), so a panel's
 * bundle has no extra lazy entry points.
 */
export const lazyPanelLayouts: Record<string, AnyComponent> = lazyComponents<AnyComponent>({
  'layout:fullscreen': () => import('./FullscreenLayout.svelte').then((m) => m.default),
}).map(discoveredComponent).components
