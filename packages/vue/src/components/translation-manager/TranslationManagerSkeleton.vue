<script setup lang="ts">
import type { TranslationManagerSchema } from '@alfakit/core'
import { computed } from 'vue'
import Card from '../ui/Card.vue'
import CardContent from '../ui/CardContent.vue'
import Skeleton from '../ui/Skeleton.vue'

const props = defineProps<{ component?: TranslationManagerSchema }>()
const count = computed(() => Math.min(8, Math.max(3, props.component?.rows.length ?? 5)))
</script>

<template>
  <Card class="gap-4 py-4" aria-busy="true" data-slot="translation-manager">
    <CardContent class="flex flex-col gap-2 px-5" aria-hidden="true">
      <Skeleton class="h-9" />
      <Skeleton v-for="index in count" :key="index" class="h-12" />
    </CardContent>
  </Card>
</template>
