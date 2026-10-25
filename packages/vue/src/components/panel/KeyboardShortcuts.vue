<script setup lang="ts">
import type { CommandSchema } from '@alfakit/core'
import {
  commandShortcutId,
  COMMANDS_COMPONENT,
  focusTableSearch,
  SHORTCUT_IDS,
  shortcuts,
} from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { computed, ref, shallowRef, watch, type Component } from 'vue'
import { useActionRunner, usePageSchema, usePanel, useT } from '../../context'
import { shortcutsOverlay } from './lazy-chrome'

/**
 * Keyboard shortcuts of the panel: `/` (focus the table search), `g d` (dashboard), `?`
 * (the overlay) and the panel commands' `shortcut()`, with the user's customised keys
 * (`alfakit.keyboardShortcuts`).
 */
const t = useT()
const panel = usePanel()
const page = usePageSchema()
const runner = useActionRunner()
const open = ref(false)
// Null on the server and during hydration (nothing loads there), so the markup matches.
const Overlay = shallowRef<Component | null>(shortcutsOverlay.current)

// `?` (or the palette's "Keyboard shortcuts") before the code has arrived keeps `open` set;
// the overlay mounts open once it has loaded.
watch(open, (value, _old, onCleanup) => {
  if (!value) return

  // Already loaded (by another instance): mount it straight away.
  if (shortcutsOverlay.current) {
    Overlay.value = shortcutsOverlay.current

    return
  }

  let active = true
  onCleanup(() => {
    active = false
  })

  shortcutsOverlay.load().then(
    (component) => {
      if (active) Overlay.value = component
    },
    () => {
      if (active) open.value = false
    },
  )
})
const config = computed(() => panel.value.keyboardShortcuts)
const overrides = computed(() => JSON.stringify(config.value ? (config.value.overrides ?? {}) : {}))

watch(
  [config, overrides],
  ([value, stored]) => {
    if (typeof window === 'undefined') return

    shortcuts.setEnabled(value !== false)
    shortcuts.setOverrides(JSON.parse(stored) as Record<string, string[]>)
  },
  { immediate: true },
)

// Keyed on what the registrations depend on, so reloads (a new panel object) don't churn.
const registrations = computed(() =>
  config.value
    ? JSON.stringify({
        token: page.value?.token ?? '',
        home: panel.value.dashboardUrl ?? panel.value.url ?? null,
        commands: (panel.value.commandPalette?.commands ?? []).filter(
          (command) => command.keyBindings?.length && !command.disabled,
        ),
      })
    : '',
)

watch(
  registrations,
  (value, _old, onCleanup) => {
    if (!value || typeof window === 'undefined') return

    const { token, home, commands } = JSON.parse(value) as {
      token: string
      home: string | null
      commands: CommandSchema[]
    }

    const disposers = [
      shortcuts.register({
        id: SHORTCUT_IDS.overlay,
        keys: ['?'],
        label: t('shortcuts.show_overlay', {}, 'Show keyboard shortcuts'),
        group: 'general',
        handler: () => {
          open.value = true
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
    ]

    onCleanup(() => disposers.forEach((dispose) => dispose()))
  },
  { immediate: true },
)

const customizable = computed(() =>
  Boolean(config.value && config.value.customizable && panel.value.endpoints.shortcuts),
)
</script>

<template>
  <component
    :is="Overlay"
    v-if="config && Overlay"
    :open="open"
    :customizable="customizable"
    :endpoint="panel.endpoints.shortcuts"
    @update:open="open = $event"
  />
</template>
