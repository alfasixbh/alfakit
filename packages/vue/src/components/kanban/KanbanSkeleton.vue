<script setup lang="ts">
import type { KanbanSchema, KanbanWidgetSchema } from '@alfakit/core'
import { computed } from 'vue'
import Card from '../ui/Card.vue'
import CardContent from '../ui/CardContent.vue'
import Skeleton from '../ui/Skeleton.vue'

const props = defineProps<{ component?: KanbanSchema; widget?: KanbanWidgetSchema }>()
const count = computed(() =>
  Math.min(5, Math.max(1, (props.component ?? props.widget?.kanban)?.columns.length ?? 3)),
)
</script>

<template>
  <Card class="gap-4 py-4" aria-busy="true" data-slot="kanban">
    <CardContent class="flex gap-3 overflow-hidden px-4" aria-hidden="true">
      <div v-for="index in count" :key="index" class="flex w-64 shrink-0 flex-col gap-2">
        <Skeleton class="h-10" />
        <Skeleton class="h-24" />
        <Skeleton class="h-24" />
      </div>
    </CardContent>
  </Card>
</template>
