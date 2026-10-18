<script setup lang="ts">
import type { TreeSchema, TreeWidgetSchema } from '@alfakit/core'
import { computed } from 'vue'
import Card from '../ui/Card.vue'
import CardContent from '../ui/CardContent.vue'
import Skeleton from '../ui/Skeleton.vue'

const props = defineProps<{ component?: TreeSchema; widget?: TreeWidgetSchema }>()
const count = computed(() =>
  Math.min(6, Math.max(1, (props.component ?? props.widget?.tree)?.nodes.length ?? 3)),
)
</script>

<template>
  <Card class="gap-4 py-4" aria-busy="true" data-slot="tree-widget">
    <CardContent class="flex flex-col gap-2 px-5" aria-hidden="true">
      <Skeleton v-for="index in count" :key="index" class="h-9" />
    </CardContent>
  </Card>
</template>
