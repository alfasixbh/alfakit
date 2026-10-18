<script setup lang="ts">
import type { PageSchema } from '@alfakit/core'

defineProps<{ page?: PageSchema }>()
</script>

<template>
  <div class="min-h-svh">
    <slot />
  </div>
</template>
