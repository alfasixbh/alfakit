<script setup lang="ts">
import type { PageSchema } from '@alfakit/core'
import ContentBlockRenderer from './ContentBlockRenderer.vue'

const props = defineProps<{ page: PageSchema }>()
</script>

<template>
  <div class="flex flex-col gap-6">
    <ContentBlockRenderer v-for="block in props.page.content" :key="block.key" :block="block" />
  </div>
</template>
