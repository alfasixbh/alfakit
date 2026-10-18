import { setIconAliases } from './icons'
import type { PanelSchema } from './schema/panel'

export type Appearance = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'alfakit_appearance'

/**
 * The colour scheme the user picked with the switcher, or `fallback` when they never
 * picked one (the panel's `defaultThemeMode()`).
 */
export function getStoredAppearance(fallback: Appearance = 'system'): Appearance {
  if (typeof localStorage === 'undefined') {
    return fallback
  }

  try {
    const value = localStorage.getItem(STORAGE_KEY)

    return value === 'light' || value === 'dark' || value === 'system' ? value : fallback
  } catch {
    return fallback
  }
}

/**
 * The colour scheme to use for a panel: the user's choice, else `defaultThemeMode()`.
 * Without the switcher (`themeSwitcher(false)`) always the default.
 */
export function panelAppearance(panel?: Pick<PanelSchema, 'darkMode'> | null): Appearance {
  const fallback: Appearance = panel?.darkMode.default ?? 'system'

  return panel?.darkMode.switcher === false ? fallback : getStoredAppearance(fallback)
}

export function resolveAppearance(appearance: Appearance): 'light' | 'dark' {
  if (appearance !== 'system') {
    return appearance
  }

  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function applyAppearance(
  appearance: Appearance,
  panel?: Pick<PanelSchema, 'darkMode'>,
): void {
  if (typeof document === 'undefined') {
    return
  }

  const resolved = panel?.darkMode.forced
    ? 'dark'
    : panel?.darkMode.enabled === false
      ? 'light'
      : resolveAppearance(appearance)

  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.documentElement.style.colorScheme = resolved
}

export function setAppearance(appearance: Appearance, panel?: Pick<PanelSchema, 'darkMode'>): void {
  try {
    localStorage.setItem(STORAGE_KEY, appearance)
  } catch {
    // Storage may be unavailable (private mode); the cookie still persists the choice.
  }

  if (typeof document !== 'undefined') {
    document.cookie = `${STORAGE_KEY}=${appearance};path=/;max-age=31536000;SameSite=Lax`
  }

  applyAppearance(appearance, panel)
}

/** Apply stored appearance on boot and follow OS changes while in `system` mode. */
export function initializeAppearance(panel?: Pick<PanelSchema, 'darkMode'>): () => void {
  applyAppearance(panelAppearance(panel), panel)

  if (typeof window === 'undefined') {
    return () => {}
  }

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const listener = () => {
    if (panelAppearance(panel) === 'system') {
      applyAppearance('system', panel)
    }
  }

  media.addEventListener('change', listener)

  return () => media.removeEventListener('change', listener)
}

/**
 * Whether the sidebar starts expanded, from the stored state the server shares
 * (`alfakitSidebarOpen`): the `rail` layout starts as icons until the user expands it,
 * other layouts start open until the user collapses them. Server and browser agree, so
 * server-rendered markup hydrates without a mismatch.
 */
export function sidebarDefaultOpen(stored: boolean | null | undefined, layout?: string): boolean {
  return layout === 'rail' ? stored === true : stored !== false
}

let appliedColors: string[] = []

/** Colour names every renderer maps to its own classes (`HasTheme::BUILT_IN_COLORS`). */
export const BUILT_IN_COLORS = [
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
  'info',
  'gray',
] as const

/**
 * Whether a colour is a custom panel colour name (`colors(['brand' => …])`), as opposed to
 * a built-in name or a CSS value such as `#4f46e5`.
 */
export function isCustomColorName(color: string | null | undefined): color is string {
  return (
    typeof color === 'string' &&
    /^[a-z][a-z0-9-]*$/i.test(color) &&
    !(BUILT_IN_COLORS as readonly string[]).includes(color)
  )
}

/**
 * Classes for a custom colour name: the generic utility of themes.css (`alfakit-solid`,
 * `alfakit-soft`, …) plus the server's `alfakit-color-{name}` rule pointing it at
 * `--alfakit-{name}`.
 */
export function customColorClasses(color: string, utility: string): string {
  return `${utility} alfakit-color-${color}`
}

/**
 * Inject the panel's `colors([...])` as CSS variables consumed by the adapter stylesheet
 * (`--alfakit-primary`, …). Any CSS colour works; shadcn tokens are derived in CSS.
 * Colours of a previously visited panel are removed.
 */
export function applyPanelColors(
  colors: Record<string, string> | undefined,
  colorCss?: string | null,
): void {
  if (typeof document === 'undefined') {
    return
  }

  // `colors(['gray' => …])` tints the neutral tokens (themes.css).
  if (colors?.gray) document.documentElement.setAttribute('data-alfakit-gray', 'true')
  else document.documentElement.removeAttribute('data-alfakit-gray')

  applyColorCss(colorCss)

  const style = document.documentElement.style
  const names = Object.keys(colors ?? {})

  for (const name of appliedColors) {
    if (!names.includes(name)) style.removeProperty(`--alfakit-${name}`)
  }

  for (const [name, value] of Object.entries(colors ?? {})) {
    style.setProperty(`--alfakit-${name}`, value)
  }

  appliedColors = names
}

/**
 * Keep the `<style data-alfakit-colors>` element (rendered by the root view) in sync with
 * the panel's custom colour classes (`PanelSchema.colorCss`, built by the server).
 */
function applyColorCss(css: string | null | undefined): void {
  let element = document.head.querySelector<HTMLStyleElement>('style[data-alfakit-colors]')

  if (!css) {
    element?.remove()

    return
  }

  if (!element) {
    element = document.createElement('style')
    element.setAttribute('data-alfakit-colors', '')
    document.head.appendChild(element)
  }

  if (element.textContent !== css) element.textContent = css
}

/**
 * Keep `<html>` in sync with the current panel's theme after Inertia visits (the root
 * view sets the same attributes for the first paint): theme, sidebar style, density,
 * panel id, radius, font and the font stylesheet.
 */
export function applyPanelTheme(
  panel:
    | (Pick<PanelSchema, 'id' | 'theme' | 'colors'> &
        Partial<Pick<PanelSchema, 'favicon' | 'colorCss' | 'starterKit'>>)
    | undefined,
): void {
  if (typeof document === 'undefined' || !panel?.theme) {
    return
  }

  setIconAliases(panel.theme.icons)

  // `starterKit()`: the host application owns the document's theme (its shadcn tokens,
  // fonts, favicon and colour scheme). Only the `--alfakit-*` colours are set; the starter kit
  // stylesheet (`standalone.css`) uses them for the status colours shadcn has no tokens for.
  if (panel.starterKit === true) {
    applyPanelColors(panel.colors, panel.colorCss)

    return
  }

  applyPanelFavicon(panel.favicon)

  const root = document.documentElement
  const { theme } = panel
  const attributes: Record<string, string> = {
    'data-panel': panel.id,
    'data-alfakit-theme': theme.attribute,
    'data-sidebar-variant': theme.sidebar,
    'data-density': theme.density,
  }

  for (const [dimension, value] of Object.entries(theme.design ?? {})) {
    attributes[`data-${dimension}`] = value
  }

  for (const [name, value] of Object.entries(attributes)) {
    if (root.getAttribute(name) !== value) root.setAttribute(name, value)
  }

  if (theme.radius) root.style.setProperty('--radius', theme.radius)
  else root.style.removeProperty('--radius')

  if (theme.fontCss) root.style.setProperty('--alfakit-font', theme.fontCss)
  else root.style.removeProperty('--alfakit-font')

  if (theme.headingFontCss) root.style.setProperty('--alfakit-heading-font', theme.headingFontCss)
  else root.style.removeProperty('--alfakit-heading-font')

  applyPanelColors(panel.colors, panel.colorCss)

  for (const url of theme.fontUrls ?? (theme.fontUrl ? [theme.fontUrl] : [])) {
    if (!document.querySelector(`link[rel="stylesheet"][href="${CSS.escape(url)}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = url
      link.dataset.alfakitFont = ''
      document.head.appendChild(link)
    }
  }
}

/**
 * Point `<link rel="icon">` at the panel's favicon after Inertia visits (switching
 * panels or tenants), adding the link when the first page had none.
 */
export function applyPanelFavicon(url: string | null | undefined): void {
  if (typeof document === 'undefined') {
    return
  }

  const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')]

  if (!url) {
    for (const link of links) if (link.dataset.alfakitFavicon !== undefined) link.remove()

    return
  }

  if (links.length === 0) {
    const link = document.createElement('link')
    link.rel = 'icon'
    link.dataset.alfakitFavicon = ''
    document.head.appendChild(link)
    links.push(link)
  }

  for (const link of links) {
    if (link.getAttribute('href') !== url) link.setAttribute('href', url)
  }
}

export const SEMANTIC_COLORS = [
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
  'info',
  'gray',
] as const
