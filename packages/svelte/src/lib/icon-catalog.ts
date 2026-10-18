import { iconImports } from './icon-imports'
import { ALIASES, registered } from './icons'

// Kept apart from `./icons`, which loads the name → chunk map lazily: only an application
// that asks whether an icon exists (or lists them all) bundles the map statically.

/** Whether `<Icon name="…" />` can draw `name` (a Lucide icon, alias or registered icon). */
export function hasIcon(name: string): boolean {
  if (registered[name] || iconImports[name]) return true

  const alias = ALIASES[name]

  return !!alias && !!(registered[alias] || iconImports[alias])
}

/** Every icon name `<Icon />` accepts, sorted. */
export function iconNames(): string[] {
  return [...new Set([...Object.keys(iconImports), ...Object.keys(registered)])].sort()
}
