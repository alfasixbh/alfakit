<script setup lang="ts">
import { fixedContainingBlockOffset, type EditorSuggestions } from '@alfakit/core'
import type { Editor } from '@tiptap/vue-3'
import { computed } from 'vue'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import { useStore } from '../../composables/use-store'

/** The mention / merge tag listbox under the trigger. */
const props = defineProps<{
  suggestions: EditorSuggestions
  editor: Editor | undefined
  id: string
}>()
const t = useT()
const state = useStore(props.suggestions.store)
// Inside a modal the dialog's transform is the containing block of this fixed list.
const position = computed(() => {
  const coords = state.value.coords

  if (!coords) return undefined

  const offset = fixedContainingBlockOffset(props.editor?.view.dom)

  return { left: `${coords.left - offset.x}px`, top: `${coords.bottom + 4 - offset.y}px` }
})
</script>

<template>
  <div
    v-if="state.open && props.editor"
    :id="props.id"
    role="listbox"
    :aria-label="t('editor.suggestions', {}, 'Suggestions')"
    data-slot="rich-editor-suggestions"
    class="bg-popover text-popover-foreground fixed z-50 min-w-48 overflow-hidden rounded-md border p-1 shadow-md"
    :style="position"
  >
    <div
      v-if="state.loading && state.items.length === 0"
      class="text-muted-foreground px-2 py-1.5 text-sm"
    >
      {{ t('loading', {}, 'Loading…') }}
    </div>
    <div v-else-if="state.items.length === 0" class="text-muted-foreground px-2 py-1.5 text-sm">
      {{ t('no_results', {}, 'No results.') }}
    </div>
    <template v-else>
      <div
        v-for="(item, index) in state.items"
        :id="`${props.id}-${index}`"
        :key="item.id"
        role="option"
        :aria-selected="index === state.index"
        :class="
          cn(
            'cursor-pointer rounded-sm px-2 py-1.5 text-sm',
            index === state.index && 'bg-accent text-accent-foreground',
          )
        "
        @mousedown.prevent
        @mouseenter="props.suggestions.highlight(index)"
        @click="props.editor && props.suggestions.select(index, props.editor)"
      >
        {{ state.kind === 'mention' ? `${state.trigger}${item.label}` : item.label }}
      </div>
    </template>
  </div>
</template>
