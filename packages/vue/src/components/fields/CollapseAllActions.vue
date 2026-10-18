<script setup lang="ts">
import type { ActionContext, ItemActionSchema } from '@alfakit/core'
import ItemActionButton from './ItemActionButton.vue'

/** "Collapse all" / "Expand all" above collapsible items. */
const props = defineProps<{
  context: ActionContext
  collapseAll: ItemActionSchema | null
  expandAll: ItemActionSchema | null
}>()
const emit = defineEmits<{ collapseAll: []; expandAll: [] }>()
</script>

<template>
  <div
    v-if="props.collapseAll || props.expandAll"
    class="flex justify-end gap-3"
    data-slot="item-collapse-actions"
  >
    <ItemActionButton
      :action="props.collapseAll"
      :context="props.context"
      @client="emit('collapseAll')"
    />
    <ItemActionButton
      :action="props.expandAll"
      :context="props.context"
      @client="emit('expandAll')"
    />
  </div>
</template>
