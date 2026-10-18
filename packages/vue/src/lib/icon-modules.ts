import type { Component } from 'vue'
import { iconAliases } from './icon-aliases'

/**
 * Every Lucide icon file by path; each icon becomes its own chunk, like
 * `lucide-react/dynamic`. `./icons` loads this module lazily outside a panel.
 */
export const iconModules = import.meta.glob<{ default: Component }>([
  '../../node_modules/@lucide/vue/dist/esm/icons/*.mjs',
  '!**/icons/index.mjs',
])

export type IconModules = typeof iconModules

/** The key of `name`'s file in `iconModules`. */
export function iconPath(name: string, modules: IconModules): string {
  const file = `../../node_modules/@lucide/vue/dist/esm/icons/${name}.mjs`

  // Legacy names (`filter`, `trash-2`, `home`) are only exported from the index, not as files.
  return file in modules || iconAliases[name] === undefined
    ? file
    : `../../node_modules/@lucide/vue/dist/esm/icons/${iconAliases[name]}.mjs`
}
