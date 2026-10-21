<script setup lang="ts">
import { injectListboxRootContext } from 'reka-ui'
import { nextTick, watch } from 'vue'

/**
 * Inside a `Command`: highlights the first item when `items` change and nothing (still on
 * the page) is highlighted, as cmdk does in React. Results that arrive after typing (a
 * server search) would otherwise leave Enter with nothing to select.
 */
const props = defineProps<{ items: unknown }>()
const root = injectListboxRootContext()

watch(
  () => props.items,
  () =>
    nextTick(() => {
      const highlighted = root.highlightedElement.value

      if (!highlighted || !highlighted.isConnected) root.highlightFirstItem()
    }),
  { deep: true },
)
</script>

<template>
  <slot />
</template>
