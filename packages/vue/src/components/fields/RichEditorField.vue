<script setup lang="ts">
import type { LoadedRichEditorExtensions, RichEditorSchema } from '@alfakit/core'
import { loadRichEditorExtensions } from '@alfakit/core'
import { computed, shallowRef, watch } from 'vue'
import RichEditorInput from './RichEditorInput.vue'
import RichEditorSkeleton from './RichEditorSkeleton.vue'

/**
 * The rich and Markdown editors. Plugin extensions (`RichEditor::plugins()`) load before
 * the editor is created, since Tiptap extensions can't be added afterwards.
 */
const props = defineProps<{ component: RichEditorSchema }>()

const NO_EXTENSIONS: LoadedRichEditorExtensions = { extensions: [], commands: {} }

const signature = computed(() =>
  (props.component.type === 'MarkdownEditor' ? [] : (props.component.extensions ?? [])).join('|'),
)
const loaded = shallowRef<{ signature: string; value: LoadedRichEditorExtensions } | null>(
  signature.value === '' ? { signature: '', value: NO_EXTENSIONS } : null,
)

watch(
  signature,
  (current, _previous, onCleanup) => {
    if (loaded.value?.signature === current) return

    let cancelled = false

    onCleanup(() => (cancelled = true))

    void loadRichEditorExtensions(current === '' ? [] : current.split('|')).then((value) => {
      if (!cancelled) loaded.value = { signature: current, value }
    })
  },
  { immediate: true },
)
</script>

<template>
  <RichEditorInput
    v-if="loaded && loaded.signature === signature"
    :key="signature"
    :component="props.component"
    :plugins="loaded.value"
  />
  <RichEditorSkeleton v-else :component="props.component" />
</template>
