/**
 * Icon values as the server resolves them (`Icons::resolve()`): a Lucide name, an image URL
 * or sanitised `<svg>` markup. Renderers' `<Icon>` components draw all three.
 */
export type IconSource =
  { type: 'name'; name: string } | { type: 'url'; url: string } | { type: 'svg'; svg: string }

const URL_PATTERN = /^(?:https?:\/\/|\/\/|\/|\.\/|data:image\/(?:png|gif|jpeg|webp|svg\+xml)[;,])/i

/** What kind of icon a resolved value is. */
export function iconSource(icon: string): IconSource {
  const value = icon.trim()

  // Markup only ever comes from the server, which sanitises it (`SvgSanitizer`).
  if (value.startsWith('<')) return { type: 'svg', svg: value }

  if (URL_PATTERN.test(value)) return { type: 'url', url: value }

  return { type: 'name', name: value }
}

let aliases: Record<string, string> = {}

/**
 * The icon aliases the app replaced with `Icons::register()` (shared as
 * `PanelThemeSchema.icons`). `applyPanelTheme()` keeps them current.
 */
export function setIconAliases(overrides: Record<string, string> | null | undefined): void {
  aliases = { ...(overrides ?? {}) }
}

/**
 * Resolve an `alfakit::` alias: the app's replacement, or `fallback` (the renderer's
 * built-in icon). Other names are returned unchanged.
 *
 * ```ts
 * <Icon name={iconAlias('alfakit::panels.sidebar.collapse-button', 'chevron-left')} />
 * ```
 */
export function iconAlias(name: string, fallback?: string): string {
  if (!name.startsWith('alfakit::')) return name

  return aliases[name] ?? fallback ?? name
}

/**
 * The app's replacement for an `alfakit::` alias, or `undefined` when it kept the default.
 * Renderer chrome uses this to draw its statically imported glyph synchronously (no
 * lazy-load flash) unless the app registered a replacement.
 */
export function iconAliasOverride(name: string): string | undefined {
  return name.startsWith('alfakit::') ? aliases[name] : undefined
}

/**
 * The icon of a built-in repeater, builder or key-value item button: the app's replacement
 * for `alfakit::forms.components.{kind}.actions.{action}`, or the renderer's default.
 * Customised item actions arrive resolved from the server; the defaults use this.
 */
export function itemActionIcon(
  kind: 'repeater' | 'builder' | 'key-value',
  action: string,
  fallback: string,
): string {
  return iconAlias(`alfakit::forms.components.${kind}.actions.${action}`, fallback)
}

/** Whether an icon name is an unresolved `alfakit::` alias. */
export function isIconAlias(name: string): boolean {
  return name.startsWith('alfakit::')
}
