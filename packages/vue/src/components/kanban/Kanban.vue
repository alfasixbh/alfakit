<script setup lang="ts">
import type { KanbanSchema, KanbanWidgetSchema } from '@alfakit/core'
import { computed } from 'vue'
import KanbanBoard from './KanbanBoard.vue'

/**
 * The board of a `KanbanPage` (schema component `kanban`) or a `KanbanWidget`
 * (alfasix/alfakit-kanban).
 */
const props = defineProps<{ component?: KanbanSchema; widget?: KanbanWidgetSchema }>()
const board = computed(() => props.component ?? props.widget?.kanban)
</script>

<template>
  <KanbanBoard v-if="board" :key="board.actionComponent" :board="board" />
</template>
