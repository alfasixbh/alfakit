import { iconModules, iconPath } from './icon-modules'

// Kept apart from `./icons`, which loads the icon map lazily: only an application that asks
// whether an icon exists bundles the map statically.

/** Whether `<Icon name="…" />` can draw `name` (a Lucide icon or legacy alias). */
export function hasIcon(name: string): boolean {
  return iconPath(name, iconModules) in iconModules
}
