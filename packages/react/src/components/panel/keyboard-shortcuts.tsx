import type { CommandSchema } from '@alfakit/core'
import {
  COMMANDS_COMPONENT,
  commandShortcutId,
  focusTableSearch,
  SHORTCUT_IDS,
  shortcuts,
} from '@alfakit/core'
import { router } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { useActionRunner, usePageSchema, usePanel, useT } from '../../context'
import type { ShortcutsOverlay as Overlay } from './shortcuts-overlay'

type OverlayComponent = typeof Overlay

let loadedOverlay: OverlayComponent | undefined
let loadingOverlay: Promise<OverlayComponent> | undefined

/** The `?` overlay's code: loaded the first time it opens; the shortcuts register eagerly. */
function loadOverlay(): Promise<OverlayComponent> {
  loadingOverlay ??= import('./shortcuts-overlay').then(
    (module) => (loadedOverlay = module.ShortcutsOverlay),
    (error: unknown) => {
      loadingOverlay = undefined
      throw error
    },
  )

  return loadingOverlay
}

/**
 * Keyboard shortcuts of the panel: `/` (focus the table search), `g d` (dashboard), `?`
 * (the overlay) and the panel commands' `shortcut()`, with the user's customised keys
 * (`alfakit.keyboardShortcuts`). The overlay lists everything available on the page,
 * grouped, and lets users change keys (stored on the server).
 */
export function KeyboardShortcuts() {
  const t = useT()
  const panel = usePanel()
  const page = usePageSchema()
  const runner = useActionRunner()
  const config = panel.keyboardShortcuts
  const [open, setOpen] = useState(false)
  // Undefined on the server and during hydration (nothing loads there), so the markup matches.
  const [ShortcutsOverlay, setOverlay] = useState<OverlayComponent | undefined>(() => loadedOverlay)
  const overrides = JSON.stringify(config ? (config.overrides ?? {}) : {})
  const token = page?.token ?? ''
  const commands = panel.commandPalette?.commands
  const home = panel.url
  // Strings, so the effect below doesn't re-run on every render (`t` is a new function each time).
  const overlayLabel = t('shortcuts.show_overlay', {}, 'Show keyboard shortcuts')
  const searchLabel = t('shortcuts.focus_search', {}, 'Search the table')
  const dashboardLabel = t('shortcuts.go_dashboard', {}, 'Go to the dashboard')

  useEffect(() => {
    shortcuts.setEnabled(config !== false)
    shortcuts.setOverrides(JSON.parse(overrides) as Record<string, string[]>)
  }, [config, overrides])

  useEffect(() => {
    if (!config) return

    const disposers = [
      shortcuts.register({
        id: SHORTCUT_IDS.overlay,
        keys: ['?'],
        label: overlayLabel,
        group: 'general',
        handler: () => setOpen(true),
      }),
      // Declined (`false`) on pages without a table search, so `/` keeps its default.
      shortcuts.register({
        id: SHORTCUT_IDS.search,
        keys: ['/'],
        label: searchLabel,
        group: 'general',
        handler: () => focusTableSearch(),
      }),
      ...(home
        ? [
            shortcuts.register({
              id: SHORTCUT_IDS.dashboard,
              keys: ['g d'],
              label: dashboardLabel,
              group: 'navigation',
              handler: () => router.visit(home),
            }),
          ]
        : []),
      ...(commands ?? [])
        .filter((command: CommandSchema) => command.keyBindings?.length && !command.disabled)
        .map((command: CommandSchema) =>
          shortcuts.register({
            id: commandShortcutId(command.name),
            keys: command.keyBindings ?? [],
            label: command.label ?? command.name,
            group: command.url ? 'navigation' : 'commands',
            handler: () => void runner.trigger(command, { token, component: COMMANDS_COMPONENT }),
          }),
        ),
    ]

    return () => disposers.forEach((dispose) => dispose())
  }, [config, commands, home, runner, token, overlayLabel, searchLabel, dashboardLabel])

  // `?` (or the palette's "Keyboard shortcuts") before the code has arrived keeps `open`
  // set; the overlay mounts open once it has loaded.
  useEffect(() => {
    if (!open || ShortcutsOverlay) return

    let active = true

    loadOverlay().then(
      (component) => active && setOverlay(() => component),
      () => active && setOpen(false),
    )

    return () => {
      active = false
    }
  }, [open, ShortcutsOverlay])

  if (!config || !ShortcutsOverlay) return null

  return (
    <ShortcutsOverlay
      open={open}
      onOpenChange={setOpen}
      customizable={Boolean(config.customizable && panel.endpoints.shortcuts)}
      endpoint={panel.endpoints.shortcuts}
    />
  )
}
