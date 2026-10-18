import type { PanelSchema } from './schema/panel'

/**
 * `sidebarWidth()` / `collapsedSidebarWidth()` as the shadcn sidebar's CSS variables, for
 * the sidebar wrapper's `style`. Undefined when the panel keeps the default widths.
 */
export function sidebarWidthStyle(
  panel: Pick<PanelSchema, 'sidebarWidth' | 'collapsedSidebarWidth'> | null | undefined,
): Record<string, string> | undefined {
  const style: Record<string, string> = {}

  if (panel?.sidebarWidth) style['--sidebar-width'] = panel.sidebarWidth
  if (panel?.collapsedSidebarWidth) style['--sidebar-width-icon'] = panel.collapsedSidebarWidth

  return Object.keys(style).length > 0 ? style : undefined
}
