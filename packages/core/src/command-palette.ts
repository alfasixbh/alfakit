import { flattenActionGroup, type ActionContext } from './actions'
import { htmlLabelToText } from './field-layout'
import { hasThemeSwitcher } from './panel-chrome'
import type { ActionSchema } from './schema/actions'
import {
  COMMANDS_COMPONENT,
  type CommandPaletteResponse,
  type CommandSchema,
} from './schema/command-palette'
import type { IconName } from './schema/common'
import type { NavigationItemSchema, PageSchema, PanelSchema } from './schema/panel'
import type { Appearance } from './theme'

/**
 * Command palette 2.0: everything the palette can do besides global search, as one list of
 * items the renderers group, filter (fuzzy, on labels and keywords) and run.
 */

/** Built-in groups, in display order; panel commands with `group()` get `commands:<label>`. */
export const PALETTE_GROUP_ORDER = [
  'recent',
  'actions',
  'commands',
  'create',
  'navigation',
  'search',
  'theme',
  'help',
] as const

export type PaletteItemKind = 'action' | 'url' | 'theme' | 'shortcut' | 'install'

export interface PaletteItem {
  /** Unique within the palette (also the combobox option value). */
  id: string
  /** `recent`, `actions`, `commands`, `commands:<label>`, `create`, `navigation`, `theme`, `help`. */
  group: string
  /** Heading of custom groups (`Command::group()`) and parent labels of navigation items. */
  groupLabel?: string
  label: string
  description?: string
  icon?: IconName
  keywords?: string[]
  /** First key binding, shown as a hint. */
  shortcut?: string
  kind: PaletteItemKind
  /** `action`: run with `runner.trigger(action, context)`. */
  action?: ActionSchema
  context?: ActionContext
  /** `url`: visit (or open in a new tab). */
  url?: string
  openInNewTab?: boolean
  /** `theme`: the colour scheme to switch to. */
  appearance?: Appearance
  /** `shortcut`: the shortcut to trigger (e.g. the overlay). */
  shortcutId?: string
}

export interface PaletteGroup {
  id: string
  /** Custom group label; built-in groups are translated by the renderer from `id`. */
  label?: string
  items: PaletteItem[]
}

export interface PaletteLabels {
  light: string
  dark: string
  system: string
  shortcuts: string
}

export interface PaletteSources {
  panel: PanelSchema
  page?: PageSchema | null
  /** The `commandPalette` endpoint's response, once loaded. */
  loaded?: CommandPaletteResponse | null
  labels: PaletteLabels
  /** Whether the shortcuts overlay is available (adds "Keyboard shortcuts"). */
  shortcutsOverlay?: boolean
  /** `Panel::pwa()`: the "Install app" label, while the app can be installed (`canInstallPwa()`). */
  install?: string
}

/**
 * Fuzzy match score of `query` in `text` (higher is better), or null without a match.
 * Every query character must appear in order; consecutive runs, word starts and an exact
 * prefix score higher.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const needle = normalize(query)
  const haystack = normalize(text)

  if (needle === '') return 0
  if (haystack === '') return null

  if (haystack === needle) return 1000
  if (haystack.startsWith(needle)) return 800 - haystack.length

  const contains = haystack.indexOf(needle)

  if (contains >= 0) {
    const wordStart = contains === 0 || /[\s\-_/.:]/.test(haystack[contains - 1] ?? '')

    return (wordStart ? 600 : 400) - contains
  }

  let score = 0
  let position = 0
  let previous = -2

  for (const character of needle) {
    if (character === ' ') continue

    const found = haystack.indexOf(character, position)

    if (found < 0) return null

    score += found === previous + 1 ? 8 : 1
    if (found === 0 || /[\s\-_/.:]/.test(haystack[found - 1] ?? '')) score += 6

    previous = found
    position = found + 1
  }

  return score - Math.min(haystack.length, 50) / 10
}

function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase().trim()
}

/** The best score of an item over its label, keywords and group label. */
export function scorePaletteItem(item: PaletteItem, query: string): number | null {
  if (query.trim() === '') return 0

  const candidates: Array<[string, number]> = [
    [item.label, 0],
    ...(item.keywords ?? []).map((keyword): [string, number] => [keyword, -50]),
    ...(item.groupLabel ? [[`${item.groupLabel} ${item.label}`, -20] as [string, number]] : []),
    ...(item.description ? [[item.description, -100] as [string, number]] : []),
  ]

  let best: number | null = null

  for (const [text, penalty] of candidates) {
    const score = fuzzyScore(query, text)

    if (score !== null && (best === null || score + penalty > best)) best = score + penalty
  }

  return best
}

function navigationItems(items: NavigationItemSchema[], parent?: string): PaletteItem[] {
  return items.flatMap((item) => {
    const label = item.labelHtml ? htmlLabelToText(item.label) : item.label
    const own: PaletteItem[] = item.url
      ? [
          {
            id: `navigation:${item.url}`,
            group: 'navigation',
            label,
            ...(parent ? { groupLabel: parent } : {}),
            ...(item.icon ? { icon: item.icon } : {}),
            kind: 'url',
            url: item.url,
            ...(item.openInNewTab ? { openInNewTab: true } : {}),
          },
        ]
      : []

    return [...own, ...navigationItems(item.children ?? [], label)]
  })
}

function actionItem(
  action: ActionSchema,
  group: string,
  context: ActionContext,
  extra: Partial<PaletteItem> = {},
): PaletteItem | null {
  const label = action.label ?? action.tooltip

  // Client-side buttons (submitting a form, the notifications drawer) don't belong here.
  if (
    !label ||
    action.disabled ||
    action.submitsModal ||
    action.formId ||
    action.opensDatabaseNotifications
  ) {
    return null
  }

  return {
    id: `${group}:${action.name}`,
    group,
    label,
    ...(action.icon ? { icon: action.icon } : {}),
    ...(action.keyBindings?.[0] ? { shortcut: action.keyBindings[0] } : {}),
    kind: 'action',
    action,
    context,
    ...extra,
  }
}

/** Every palette item from the panel, the page and the loaded links. */
export function commandPaletteItems({
  panel,
  page,
  loaded,
  labels,
  shortcutsOverlay,
  install,
}: PaletteSources): PaletteItem[] {
  const config = panel.commandPalette

  if (!config) return []

  const token = page?.token ?? ''
  const items: PaletteItem[] = []

  for (const record of loaded?.recent ?? []) {
    items.push({
      id: `recent:${record.url}`,
      group: 'recent',
      label: record.title,
      groupLabel: record.group,
      ...(record.icon ? { icon: record.icon } : {}),
      kind: 'url',
      url: record.url,
    })
  }

  for (const action of flattenActionGroup(page?.headerActions ?? [])) {
    const item = actionItem(action, 'actions', { token, component: 'page' })
    if (item) items.push(item)
  }

  for (const command of config.commands as CommandSchema[]) {
    const group = command.group ? `commands:${command.group}` : 'commands'
    const item = actionItem(
      command,
      group,
      { token, component: COMMANDS_COMPONENT },
      {
        ...(command.group ? { groupLabel: command.group } : {}),
        ...(command.keywords ? { keywords: command.keywords } : {}),
        ...(command.description ? { description: command.description } : {}),
      },
    )
    if (item) items.push(item)
  }

  for (const link of loaded?.create ?? []) {
    items.push({
      id: `create:${link.url}`,
      group: 'create',
      label: link.label,
      ...(link.icon ? { icon: link.icon } : {}),
      ...(link.keywords ? { keywords: link.keywords } : {}),
      kind: 'url',
      url: link.url,
    })
  }

  for (const group of panel.navigation) {
    items.push(...navigationItems(group.items, group.label ?? undefined))
  }

  if (hasThemeSwitcher(panel) && panel.darkMode.enabled && !panel.darkMode.forced) {
    for (const appearance of ['light', 'dark', 'system'] as const) {
      items.push({
        id: `theme:${appearance}`,
        group: 'theme',
        label: labels[appearance],
        icon: appearance === 'light' ? 'sun' : appearance === 'dark' ? 'moon' : 'monitor',
        keywords: ['theme', 'appearance', 'mode'],
        kind: 'theme',
        appearance,
      })
    }
  }

  if (install) {
    items.push({
      id: 'commands:install-app',
      group: 'commands',
      label: install,
      icon: 'download',
      keywords: ['install', 'app', 'pwa', 'home screen', 'desktop'],
      kind: 'install',
    })
  }

  if (shortcutsOverlay) {
    items.push({
      id: 'help:shortcuts',
      group: 'help',
      label: labels.shortcuts,
      icon: 'keyboard',
      keywords: ['keyboard', 'shortcuts', 'keys', 'hotkeys'],
      shortcut: '?',
      kind: 'shortcut',
      shortcutId: 'help.overlay',
    })
  }

  return items
}

function groupRank(group: string): number {
  const base = group.startsWith('commands:') ? 'commands' : group
  const index = (PALETTE_GROUP_ORDER as readonly string[]).indexOf(base)

  return index < 0 ? PALETTE_GROUP_ORDER.length : index
}

/**
 * Filter and group the items for a query: best matches first within each group, groups in
 * `PALETTE_GROUP_ORDER`. Without a query every group shows its first `emptyLimit` items.
 */
export function filterCommandPalette(
  items: PaletteItem[],
  query: string,
  { limit = 8, emptyLimit = 5 }: { limit?: number; emptyLimit?: number } = {},
): PaletteGroup[] {
  const searching = query.trim() !== ''
  const groups = new Map<string, Array<{ item: PaletteItem; score: number; index: number }>>()

  items.forEach((item, index) => {
    const score = scorePaletteItem(item, query)

    if (score === null) return

    groups.set(item.group, [...(groups.get(item.group) ?? []), { item, score, index }])
  })

  return [...groups.entries()]
    .sort(([a], [b]) => groupRank(a) - groupRank(b))
    .map(([id, entries]) => {
      const sorted = searching
        ? [...entries].sort((a, b) => b.score - a.score || a.index - b.index)
        : entries
      const first = sorted[0]?.item

      return {
        id,
        ...(id.startsWith('commands:') && first?.groupLabel ? { label: first.groupLabel } : {}),
        items: sorted.slice(0, searching ? limit : emptyLimit).map((entry) => entry.item),
      }
    })
}

/** Translation key of a built-in group heading (`palette.groups.<id>`). */
export function paletteGroupKey(group: string): string {
  return `palette.groups.${group.startsWith('commands:') ? 'commands' : group}`
}

/** Whether the palette has anything besides global search (renders without global search too). */
export function hasCommandPalette(panel: Pick<PanelSchema, 'commandPalette'>): boolean {
  return Boolean(panel.commandPalette)
}
