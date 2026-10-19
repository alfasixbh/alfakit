import type { LucideIcon, LucideProps } from '@lucide/svelte'
import type { iconImports as IconImportsMap } from './icon-imports'

export type LucideIconComponent = LucideIcon
export type { LucideProps }

/**
 * Lucide icons by kebab-case name (`users`, `shopping-cart`), loaded on demand like
 * `lucide-react/dynamic`: every Lucide icon (and its legacy aliases) is available and each
 * is its own chunk, so the main bundle stays small. `registerIcons()` adds custom icons.
 *
 * The name → chunk map (~2,000 entries) is not part of any entry chunk either: panels
 * (`createAlfakit()`, starter kit pages) start loading it while they boot, and elsewhere (a
 * host's sidebar) it loads with the first icon.
 */
export const registered: Record<string, LucideIconComponent> = {}
const loaded = new Map<string, LucideIconComponent>()
const pending = new Map<string, Promise<LucideIconComponent | undefined>>()

/** Legacy Lucide names that are not shipped as files (most aliases are). */
export const ALIASES: Record<string, string> = {
  'trash-2': 'trash',
  filter: 'funnel',
  home: 'house',
  'circle-help': 'circle-question-mark',
  'help-circle': 'circle-question-mark',
  help: 'circle-question-mark',
  'bar-chart-3': 'chart-column',
  'bar-chart': 'chart-bar',
  'pie-chart': 'chart-pie',
  'line-chart': 'chart-line',
  'building-2': 'building',
  'alert-triangle': 'triangle-alert',
  'alert-circle': 'circle-alert',
  'check-circle': 'circle-check',
  'x-circle': 'circle-x',
  'more-vertical': 'ellipsis-vertical',
  'more-horizontal': 'ellipsis',
  'loader-2': 'loader-circle',
  edit: 'square-pen',
  'edit-3': 'pencil',
  'upload-cloud': 'cloud-upload',
  grid: 'grid-2x2',
}

type IconImports = typeof IconImportsMap

let iconImports: Promise<IconImports> | undefined

/** Start loading the name → chunk map ahead of the first named icon (browser only). */
export function preloadIcons(): void {
  if (typeof window !== 'undefined') loadIconImports().catch(() => undefined)
}

/** The lazy name → chunk map, loaded once. */
function loadIconImports(): Promise<IconImports> {
  iconImports ??= import('./icon-imports').then(
    (module) => module.iconImports,
    (error: unknown) => {
      iconImports = undefined

      throw error
    },
  )

  return iconImports
}

function canonical(name: string, imports: IconImports = {}): string | undefined {
  if (registered[name] || imports[name]) return name

  const alias = ALIASES[name]

  return alias && (registered[alias] || imports[alias]) ? alias : undefined
}

/** Registered and loaded icons are known without the map. */
function known(name: string): string | undefined {
  if (registered[name] || loaded.has(name)) return name

  const alias = ALIASES[name]

  return alias && (registered[alias] || loaded.has(alias)) ? alias : undefined
}

/** Add or override icons available to `<Icon name="…" />`. */
export function registerIcons(icons: Record<string, LucideIconComponent>): void {
  Object.assign(registered, icons)
}

/** The icon component if it is registered or already loaded, without loading it. */
export function resolveIcon(name: string | null | undefined): LucideIconComponent | undefined {
  const key = name ? known(name) : undefined

  return key ? (registered[key] ?? loaded.get(key)) : undefined
}

/** The icon component if it is registered (`registerIcons()`): what the server renders too. */
export function resolveRegisteredIcon(
  name: string | null | undefined,
): LucideIconComponent | undefined {
  if (!name) return undefined

  return registered[name] ?? (ALIASES[name] ? registered[ALIASES[name]] : undefined)
}

/** Load an icon by name; resolves to `undefined` for unknown names. */
export function loadIcon(
  name: string | null | undefined,
): Promise<LucideIconComponent | undefined> {
  if (!name) return Promise.resolve(undefined)

  const ready = resolveIcon(name)

  if (ready) return Promise.resolve(ready)

  return loadIconImports().then(
    (imports) => loadKnownIcon(canonical(name, imports), imports),
    () => undefined,
  )
}

function loadKnownIcon(
  key: string | undefined,
  imports: IconImports,
): Promise<LucideIconComponent | undefined> {
  if (!key) return Promise.resolve(undefined)

  const ready = registered[key] ?? loaded.get(key)

  if (ready) return Promise.resolve(ready)

  let promise = pending.get(key)

  if (!promise) {
    promise = imports[key]!().then(
      (module) => {
        loaded.set(key, module.default)
        pending.delete(key)

        return module.default
      },
      () => {
        pending.delete(key)

        return undefined
      },
    )
    pending.set(key, promise)
  }

  return promise
}

// `hasIcon()` and `iconNames()` need the whole map synchronously: an application only bundles
// it statically when it calls them.
export { hasIcon, iconNames } from './icon-catalog'
