<script setup lang="ts">
import Skeleton from '../ui/Skeleton.vue'
</script>

<template>
  <div data-slot="spreadsheet" aria-busy="true" class="flex flex-col gap-3">
    <Skeleton class="h-8 w-64" />
    <Skeleton class="h-64" />
  </div>
</template>
