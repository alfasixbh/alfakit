<script lang="ts" module>
  import { lazyLoader } from '../../lib/lazy'

  // The `?` overlay's code loads the first time it opens; the shortcuts register eagerly.
  const loader = lazyLoader<{ open?: boolean; customizable: boolean; endpoint?: string }>(() =>
    import('./ShortcutsOverlay.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import type { CommandSchema } from '@alfakit/core'
  import {
    commandShortcutId,
    COMMANDS_COMPONENT,
    focusTableSearch,
    SHORTCUT_IDS,
    shortcuts,
  } from '@alfakit/core'
  import { router } from '@inertiajs/svelte'
  import { untrack } from 'svelte'
  import { useActionRunner, usePageSchema, usePanel, useT } from '../../context.svelte'

  /**
   * Keyboard shortcuts of the panel: `/` (focus the table search), `g d` (dashboard), `?`
   * (the overlay) and the panel commands' `shortcut()`, with the user's customised keys
   * (`alfakit.keyboardShortcuts`).
   */
  const t = useT()
  const runner = useActionRunner()
  const panel = $derived(usePanel())
  const page = $derived(usePageSchema())
  const config = $derived(panel.keyboardShortcuts)
  const overrides = $derived(JSON.stringify(config ? (config.overrides ?? {}) : {}))
  let open = $state(false)
  // Undefined on the server and during hydration (nothing loads there), so the markup matches.
  let Overlay = $state(untrack(() => loader.current))

  // `?` (or the palette's "Keyboard shortcuts") before the code has arrived keeps `open`
  // set; the overlay mounts open once it has loaded.
  $effect(() => {
    if (!open || Overlay) return

    loader.load().then(
      (component) => (Overlay = component),
      () => (open = false),
    )
  })

  $effect(() => {
    shortcuts.setEnabled(config !== false)
    shortcuts.setOverrides(JSON.parse(overrides) as Record<string, string[]>)
  })

  // Keyed on what the registrations depend on, so reloads (a new panel object) don't churn.
  const registrations = $derived(
    config
      ? JSON.stringify({
          token: page?.token ?? '',
          home: panel.url ?? null,
          commands: (panel.commandPalette?.commands ?? []).filter(
            (command) => command.keyBindings?.length && !command.disabled,
          ),
        })
      : '',
  )

  $effect(() => {
    if (!registrations) return

    const { token, home, commands } = JSON.parse(registrations) as {
      token: string
      home: string | null
      commands: CommandSchema[]
    }

    const disposers = untrack(() => [
      shortcuts.register({
        id: SHORTCUT_IDS.overlay,
        keys: ['?'],
        label: t('shortcuts.show_overlay', {}, 'Show keyboard shortcuts'),
        group: 'general',
        handler: () => {
          open = true
        },
      }),
      // Declined (`false`) on pages without a table search, so `/` keeps its default.
      shortcuts.register({
        id: SHORTCUT_IDS.search,
        keys: ['/'],
        label: t('shortcuts.focus_search', {}, 'Search the table'),
        group: 'general',
        handler: () => focusTableSearch(),
      }),
      ...(home
        ? [
            shortcuts.register({
              id: SHORTCUT_IDS.dashboard,
              keys: ['g d'],
              label: t('shortcuts.go_dashboard', {}, 'Go to the dashboard'),
              group: 'navigation',
              handler: () => router.visit(home),
            }),
          ]
        : []),
      ...commands.map((command) =>
        shortcuts.register({
          id: commandShortcutId(command.name),
          keys: command.keyBindings ?? [],
          label: command.label ?? command.name,
          group: command.url ? 'navigation' : 'commands',
          handler: () => void runner.trigger(command, { token, component: COMMANDS_COMPONENT }),
        }),
      ),
    ])

    return () => disposers.forEach((dispose) => dispose())
  })

  const customizable = $derived(Boolean(config && config.customizable && panel.endpoints.shortcuts))
</script>

{#if config && Overlay}
  <Overlay bind:open {customizable} endpoint={panel.endpoints.shortcuts} />
{/if}
