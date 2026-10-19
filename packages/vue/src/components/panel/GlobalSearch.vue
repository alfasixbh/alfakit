<script setup lang="ts">
import { formatKeyBinding, globalSearchSuffix, SHORTCUT_IDS, shortcuts } from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { SearchIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch, type Component } from 'vue'
import { useHydrated } from '../../composables/use-hydrated'
import { usePanel, useT } from '../../context'
import Button from '../ui/Button.vue'
import Slot from './Slot.vue'
import { Icon } from '../../lib/icons'
import { globalSearchPalette } from './lazy-chrome'

/**
 * The search field and its command palette (`GlobalSearchPalette`, loaded on first open):
 * global search results plus (with `alfakit.commandPalette`) the page's header actions,
 * panel commands, navigation, "create" links, recent records, theme switching and the
 * shortcuts overlay. `variant="sidebar"`: the full-width field in the sidebar header
 * (`globalSearch(position: Sidebar)`).
 */
const props = withDefaults(defineProps<{ variant?: 'topbar' | 'sidebar' }>(), { variant: 'topbar' })

const t = useT()
const panel = usePanel()
// The shortcut hint depends on the visitor's platform (⌘ or Ctrl): rendered after hydration.
const hydrated = useHydrated()
const open = ref(false)
// Null on the server and during hydration (nothing loads there), so the markup matches.
const Palette = shallowRef<Component | null>(globalSearchPalette.current)
const config = computed(() => panel.value.globalSearch)
const palette = computed(() => panel.value.commandPalette)
const endpoint = computed(() => (config.value ? panel.value.endpoints.globalSearch : undefined))
const placeholder = computed(
  () =>
    config.value?.placeholder ??
    palette.value?.placeholder ??
    t('palette.placeholder', {}, 'Type a command or search…'),
)
// `globalSearchFieldSuffix()`, or the first key binding (default); ⌘K / Ctrl+K without global search.
const suffix = computed(() =>
  globalSearchSuffix(
    config.value ??
      (palette.value ? { keyBindings: ['mod+k'], placeholder: placeholder.value } : undefined),
  ),
)
const keys = computed(() =>
  config.value || palette.value ? JSON.stringify(config.value?.keyBindings ?? ['mod+k']) : '',
)

// The palette's key bindings: essential, so they keep working with `keyboardShortcuts(false)`.
watch(
  keys,
  (value, _old, onCleanup) => {
    // Never during a server render: the registry is shared by every request there.
    if (!value || typeof window === 'undefined') return

    onCleanup(
      shortcuts.register({
        id: SHORTCUT_IDS.palette,
        keys: JSON.parse(value) as string[],
        label: t('shortcuts.open_palette', {}, 'Open the command palette'),
        group: 'general',
        essential: true,
        handler: () => {
          open.value = true
        },
      }),
    )
  },
  { immediate: true },
)

// Opening before the code has arrived (a click or `mod+k` right after the page loads)
// keeps `open` set; the palette mounts open once it has loaded.
watch(open, (value, _old, onCleanup) => {
  if (!value) return

  // Already loaded (by another instance): mount it straight away.
  if (globalSearchPalette.current) {
    Palette.value = globalSearchPalette.current

    return
  }

  let active = true
  onCleanup(() => {
    active = false
  })

  globalSearchPalette.load().then(
    (component) => {
      if (active) Palette.value = component
    },
    () => {
      if (active) open.value = false
    },
  )
})

const preload = () => void globalSearchPalette.load().catch(() => undefined)

// A palette opened while its code was still loading closes when the page changes.
let stopListening: (() => void) | undefined

onMounted(() => {
  stopListening = router.on('navigate', () => {
    open.value = false
  })
})

onBeforeUnmount(() => stopListening?.())
</script>

<template>
  <template v-if="(config && endpoint) || palette">
    <Slot name="global-search.before" />
    <Button
      type="button"
      variant="outline"
      size="sm"
      :data-variant="props.variant"
      :class="
        props.variant === 'sidebar'
          ? 'text-muted-foreground w-full justify-start gap-2 px-2.5 font-normal group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'
          : 'text-muted-foreground size-8 justify-center gap-2 px-0 font-normal sm:w-56 sm:justify-start sm:px-2.5'
      "
      @click="open = true"
      @pointerenter="preload"
      @focus="preload"
    >
      <Icon name="alfakit::panels.global-search.field" :fallback="SearchIcon" class="size-4" />
      <span
        :class="
          props.variant === 'sidebar'
            ? 'flex-1 truncate text-start group-data-[collapsible=icon]:sr-only'
            : 'sr-only sm:not-sr-only sm:flex-1 sm:text-start'
        "
        >{{ placeholder }}</span
      >
      <span
        v-if="suffix?.type === 'text'"
        data-slot="global-search-suffix"
        class="text-muted-foreground hidden text-[10px] sm:inline"
        >{{ suffix.text }}</span
      >
      <kbd
        v-if="hydrated && suffix?.type === 'keyBinding'"
        dir="ltr"
        class="bg-muted hidden rounded px-1 font-mono text-[10px] sm:inline"
        >{{ formatKeyBinding(suffix.keyBinding) }}</kbd
      >
    </Button>
    <Slot name="global-search.after" />
    <!-- The dialog's code loads on first open (click or shortcut); hovering or focusing the
         field fetches it ahead. Not rendered on the server, like the closed dialog before it. -->
    <component :is="Palette" v-if="Palette" v-model:open="open" />
  </template>
</template>
