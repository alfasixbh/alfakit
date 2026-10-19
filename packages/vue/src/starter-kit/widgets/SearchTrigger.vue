<script setup lang="ts">
import {
  formatKeyBinding,
  registerStarterKitSearchShortcut,
  requestStarterKitSearch,
  type StarterKitWidgets,
} from '@alfakit/core'
import { SearchIcon } from '@lucide/vue'
import { computed, watch } from 'vue'
import { useHydrated } from '../../composables/use-hydrated'

/**
 * The search field until the palette has loaded: the same look, from the shared prop
 * alone. Its key bindings and a click are remembered and open the palette once loaded.
 */
const props = defineProps<{ source: StarterKitWidgets; onLoad?: () => void }>()

const hydrated = useHydrated()
const search = computed(() => props.source.widgets.search)
const placeholder = computed(() => search.value?.placeholder ?? '')
const binding = computed(() => search.value?.keyBindings[0])

if (typeof window !== 'undefined') {
  watch(
    () => [JSON.stringify(search.value?.keyBindings ?? ['mod+k']), placeholder.value] as const,
    ([keys, label], _old, onCleanup) =>
      onCleanup(
        registerStarterKitSearchShortcut(JSON.parse(keys) as string[], label, () =>
          props.onLoad?.(),
        ),
      ),
    { immediate: true },
  )
}

function request() {
  requestStarterKitSearch()
  props.onLoad?.()
}
</script>

<template>
  <button
    type="button"
    class="border-input bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 focus-visible:ring-ring/50 text-muted-foreground inline-flex size-8 h-8 shrink-0 items-center justify-center gap-2 rounded-md border px-0 text-sm font-normal shadow-xs outline-none focus-visible:ring-[3px] sm:w-56 sm:justify-start sm:px-2.5"
    @pointerenter="props.onLoad?.()"
    @click="request"
  >
    <SearchIcon class="size-4" aria-hidden="true" />
    <span class="sr-only sm:not-sr-only sm:flex-1 sm:text-start">{{ placeholder }}</span>
    <kbd
      v-if="hydrated && binding"
      dir="ltr"
      class="bg-muted hidden rounded px-1 font-mono text-[10px] sm:inline"
      >{{ formatKeyBinding(binding) }}</kbd
    >
  </button>
</template>
