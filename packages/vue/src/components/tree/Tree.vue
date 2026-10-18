<script setup lang="ts">
import type { TreeSchema, TreeWidgetSchema } from '@alfakit/core'
import { computed } from 'vue'
import TreeView from './TreeView.vue'

/**
 * The tree of a `TreePage` (schema component `tree`) or a `TreeWidget` (alfasix/alfakit-tree).
 */
const props = defineProps<{ component?: TreeSchema; widget?: TreeWidgetSchema }>()
const tree = computed(() => props.component ?? props.widget?.tree)
</script>

<template>
  <TreeView v-if="tree" :key="tree.actionComponent" :tree="tree" />
</template>
