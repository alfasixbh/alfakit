<script setup lang="ts">
import { requestStarterKitLanguages, type StarterKitWidgets } from '@alfakit/core'
import { LanguagesIcon } from '@lucide/vue'
import { computed } from 'vue'

/**
 * The language button until its menu has loaded: the languages icon and the current
 * language in its own name (from `sm`). A click is remembered and opens the menu once loaded.
 */
const props = defineProps<{ source: StarterKitWidgets }>()

const language = computed(() => props.source.widgets.language)
</script>

<template>
  <button
    type="button"
    data-slot="language-switcher-trigger"
    :aria-label="language?.label"
    aria-haspopup="menu"
    :title="language?.label"
    class="hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent focus-visible:ring-ring/50 inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium outline-none focus-visible:ring-[3px]"
    @click="requestStarterKitLanguages()"
  >
    <LanguagesIcon class="size-4" aria-hidden="true" />
    <span
      v-if="language"
      :lang="language.current.tag"
      :dir="language.current.direction"
      class="hidden sm:inline"
      >{{ language.current.label }}</span
    >
  </button>
</template>
