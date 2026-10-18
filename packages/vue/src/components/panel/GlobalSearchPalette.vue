<script setup lang="ts">
import type {
  ActionSchema,
  CommandPaletteResponse,
  GlobalSearchGroupSchema,
  PaletteGroup,
  PaletteItem,
} from '@alfakit/core'
import {
  canInstallPwa,
  commandPaletteItems,
  createLatestRequest,
  debounce,
  filterCommandPalette,
  globalSearchDebounce,
  globalSearchStatus,
  paletteGroupKey,
  pwaStore,
  requestJson,
  setAppearance,
  shortcuts,
} from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { computed, onBeforeUnmount, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useStore } from '../../composables/use-store'
import { useActionRunner, useChoice, usePageSchema, usePanel, useT } from '../../context'
import Button from '../ui/Button.vue'
import CommandDialog from '../ui/CommandDialog.vue'
import CommandEmpty from '../ui/CommandEmpty.vue'
import CommandGroup from '../ui/CommandGroup.vue'
import CommandInput from '../ui/CommandInput.vue'
import CommandItem from '../ui/CommandItem.vue'
import CommandList from '../ui/CommandList.vue'
import Spinner from '../ui/Spinner.vue'
import ShortcutKeys from './ShortcutKeys.vue'
import { installPwa } from './pwa'
import Slot from './Slot.vue'
import { Icon } from '../../lib/icons'

type SearchGroup = GlobalSearchGroupSchema

/**
 * The command palette behind `GlobalSearch`: global search results plus (with
 * `alfakit.commandPalette`) the page's header actions, panel commands, navigation, "create"
 * links, recent records, theme switching and the shortcuts overlay. Its code loads the first
 * time the palette opens; the trigger and `mod+k` stay in the shell.
 */
const open = defineModel<boolean>('open', { default: false })

/** Groups listed after the global search results. */
const TRAILING_GROUPS = new Set(['theme', 'help'])

const t = useT()
const choice = useChoice()
const panel = usePanel()
const page = usePageSchema()
const runner = useActionRunner()
const query = ref('')
const groups = ref<SearchGroup[]>([])
const loading = ref(false)
const loaded = ref<CommandPaletteResponse | null>(null)
const config = computed(() => panel.value.globalSearch)
const palette = computed(() => panel.value.commandPalette)
const endpoint = computed(() => (config.value ? panel.value.endpoints.globalSearch : undefined))
const placeholder = computed(
  () =>
    config.value?.placeholder ??
    palette.value?.placeholder ??
    t('palette.placeholder', {}, 'Type a command or search…'),
)
const overlay = computed(
  () => panel.value.keyboardShortcuts !== false && panel.value.keyboardShortcuts !== undefined,
)

// Create links and recent records, loaded each time the palette opens (also when it mounts
// open: the first time, its code arrives after the click or `mod+k`).
watch(
  open,
  (value, _old, onCleanup) => {
    const url = panel.value.endpoints.commandPalette

    if (!value || !palette.value || !url) return

    let active = true
    onCleanup(() => {
      active = false
    })

    requestJson<CommandPaletteResponse>(url)
      .then((response) => {
        if (active) loaded.value = response
      })
      .catch(() => {
        if (active) loaded.value = { create: [], recent: [] }
      })
  },
  { immediate: true },
)

const latest = createLatestRequest()

const search = debounce((term: string) => {
  const url = endpoint.value

  if (!url || term.trim() === '') {
    latest.cancel()
    groups.value = []
    loading.value = false

    return
  }

  // Only the newest request may update the results: older responses are aborted/dropped.
  void latest
    .run(
      (signal) => requestJson<{ groups: SearchGroup[] }>(url, { query: { search: term }, signal }),
      (response) => {
        groups.value = response.groups
      },
      () => {
        loading.value = false
      },
    )
    .catch(() => {
      groups.value = []
    })
}, globalSearchDebounce(config.value))

watch(query, (term) => {
  loading.value = endpoint.value !== undefined && term.trim() !== ''
  search(term)
})

onScopeDispose(() => {
  search.cancel()
  latest.cancel()
})

// Closing the palette (or navigating away) starts the next search from scratch.
const reset = () => {
  search.cancel()
  latest.cancel()
  query.value = ''
  groups.value = []
  loading.value = false
  loaded.value = null
}

watch(open, (value) => {
  if (!value) reset()
})

let stopListening: (() => void) | undefined

onMounted(() => {
  stopListening = router.on('navigate', () => {
    open.value = false
    reset()
  })
})

onBeforeUnmount(() => stopListening?.())

// `Panel::pwa()`: "Install app" while the browser offers it (or on iOS Safari).
const pwaState = useStore(pwaStore)
const installable = computed(() => Boolean(panel.value.pwa) && canInstallPwa(pwaState.value))

const items = computed(() =>
  commandPaletteItems({
    panel: panel.value,
    page: page.value,
    loaded: loaded.value,
    shortcutsOverlay: overlay.value,
    ...(installable.value ? { install: t('pwa.install', {}, 'Install app') } : {}),
    labels: {
      light: t('palette.theme.light', {}, 'Light theme'),
      dark: t('palette.theme.dark', {}, 'Dark theme'),
      system: t('palette.theme.system', {}, 'System theme'),
      shortcuts: t('palette.shortcuts', {}, 'Keyboard shortcuts'),
    },
  }),
)
const local = computed(() => filterCommandPalette(items.value, query.value))
const leading = computed(() => local.value.filter((group) => !TRAILING_GROUPS.has(group.id)))
const trailing = computed(() => local.value.filter((group) => TRAILING_GROUPS.has(group.id)))

// Announced by the `aria-live` region once a search has finished.
const status = computed(() =>
  globalSearchStatus(
    query.value,
    loading.value,
    [...groups.value, ...local.value.map((group) => ({ results: group.items }))],
    { t, choice },
  ),
)

const defaultGroupLabels: Record<string, string> = {
  recent: 'Recent',
  actions: 'Actions',
  commands: 'Commands',
  create: 'Create',
  navigation: 'Go to',
  theme: 'Theme',
  help: 'Help',
}

const heading = (group: PaletteGroup) => {
  const id = group.id.startsWith('commands:') ? 'commands' : group.id

  return group.label ?? t(paletteGroupKey(group.id), {}, defaultGroupLabels[id] ?? id)
}

const subtitle = (group: PaletteGroup, item: PaletteItem) =>
  item.description ??
  (group.id === 'recent' || group.id === 'navigation' ? item.groupLabel : undefined)

const run = (item: PaletteItem) => {
  open.value = false

  if (item.kind === 'action' && item.action && item.context) {
    void runner.trigger(item.action, item.context)
  } else if (item.kind === 'url' && item.url) {
    if (item.openInNewTab) {
      window.open(item.url, '_blank', 'noopener,noreferrer')
    } else {
      router.visit(item.url)
    }
  } else if (item.kind === 'theme' && item.appearance) {
    setAppearance(item.appearance, panel.value)
  } else if (item.kind === 'shortcut' && item.shortcutId) {
    const id = item.shortcutId
    // After the dialog closed, so focus returns to the page before the overlay opens.
    setTimeout(() => shortcuts.trigger(id), 0)
  } else if (item.kind === 'install') {
    void installPwa(t)
  }
}

const select = (url: string) => {
  open.value = false
  router.visit(url)
}

// A URL action next to a search result (`getGlobalSearchResultActions()`); the item itself
// navigates on select, so the click must not reach it.
const visitAction = (event: MouseEvent, action: ActionSchema) => {
  event.stopPropagation()

  if (!action.url || action.openUrlInNewTab || event.metaKey || event.ctrlKey) return

  event.preventDefault()
  open.value = false
  router.visit(action.url)
}

const details = (result: SearchGroup['results'][number]) =>
  Object.entries(result.details ?? {})
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ')

const hasResults = computed(() => groups.value.length > 0 || local.value.length > 0)
</script>

<template>
  <CommandDialog
    :open="open"
    :title="palette ? t('command_palette', {}, 'Command palette') : t('search', {}, 'Search')"
    :description="placeholder"
    @update:open="open = $event"
  >
    <Slot name="global-search.start" />
    <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">{{ status }}</div>
    <CommandInput
      :placeholder="placeholder"
      :model-value="query"
      @update:model-value="query = $event"
    />
    <CommandList>
      <CommandEmpty v-if="!loading && !hasResults">{{
        query ? t('no_results', {}, 'No results.') : placeholder
      }}</CommandEmpty>
      <CommandGroup
        v-for="group in leading"
        :key="group.id"
        :heading="heading(group)"
        :data-group="group.id"
      >
        <CommandItem
          v-for="item in group.items"
          :key="item.id"
          :value="item.id"
          :data-kind="item.kind"
          @select="run(item)"
        >
          <Icon v-if="item.icon" :name="item.icon" class="size-4" />
          <div class="flex min-w-0 flex-1 flex-col">
            <span class="truncate">{{ item.label }}</span>
            <span v-if="subtitle(group, item)" class="text-muted-foreground truncate text-xs">{{
              subtitle(group, item)
            }}</span>
          </div>
          <ShortcutKeys v-if="item.shortcut" :binding="item.shortcut" class="ms-auto" />
        </CommandItem>
      </CommandGroup>
      <div v-if="loading" class="flex justify-center py-6"><Spinner /></div>
      <CommandGroup
        v-for="group in groups"
        :key="group.label"
        :heading="group.label"
        data-group="search"
      >
        <CommandItem
          v-for="result in group.results"
          :key="result.url"
          :value="`search:${group.label}:${result.url}`"
          @select="select(result.url)"
        >
          <div class="flex min-w-0 flex-1 flex-col">
            <span>{{ result.title }}</span>
            <span v-if="result.details" class="text-muted-foreground text-xs">{{
              details(result)
            }}</span>
          </div>
          <div
            v-if="result.actions?.length"
            data-slot="global-search-actions"
            class="ms-auto flex shrink-0 gap-1"
          >
            <Button
              v-for="action in result.actions.filter((item) => item.url)"
              :key="action.name"
              as-child
              variant="ghost"
              size="xs"
              class="h-6 px-2 text-xs"
            >
              <a
                :href="action.url"
                :target="action.openUrlInNewTab ? '_blank' : undefined"
                :rel="action.openUrlInNewTab ? 'noopener noreferrer' : undefined"
                :aria-label="action.label ? undefined : (action.tooltip ?? action.name)"
                @pointerdown.stop
                @click="visitAction($event, action)"
              >
                <Icon v-if="action.icon" :name="action.icon" class="size-3.5" />
                {{ action.label }}
              </a>
            </Button>
          </div>
        </CommandItem>
      </CommandGroup>
      <CommandGroup
        v-for="group in trailing"
        :key="group.id"
        :heading="heading(group)"
        :data-group="group.id"
      >
        <CommandItem
          v-for="item in group.items"
          :key="item.id"
          :value="item.id"
          :data-kind="item.kind"
          @select="run(item)"
        >
          <Icon v-if="item.icon" :name="item.icon" class="size-4" />
          <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
          <ShortcutKeys v-if="item.shortcut" :binding="item.shortcut" class="ms-auto" />
        </CommandItem>
      </CommandGroup>
    </CommandList>
    <Slot name="global-search.end" />
  </CommandDialog>
</template>
