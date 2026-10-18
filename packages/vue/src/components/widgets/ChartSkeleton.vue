<script setup lang="ts">
import type { ChartWidgetSchema } from '@alfakit/core'
import Card from '../ui/Card.vue'
import CardContent from '../ui/CardContent.vue'
import Skeleton from '../ui/Skeleton.vue'

const props = defineProps<{ widget: ChartWidgetSchema }>()
</script>

<template>
  <Card class="gap-4 py-4" aria-busy="true">
    <CardContent class="flex flex-col gap-4 px-5">
      <Skeleton v-if="props.widget.heading" class="h-5 w-1/3" aria-hidden="true" />
      <Skeleton :style="{ height: props.widget.maxHeight ?? '18rem' }" aria-hidden="true" />
    </CardContent>
  </Card>
</template>
