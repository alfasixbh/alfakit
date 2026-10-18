<script setup lang="ts">
import type { BaseEntry } from '@alfakit/core'

const props = defineProps<{ entry: BaseEntry }>()
</script>

<template>
  <span class="text-muted-foreground">{{ props.entry.placeholder ?? '—' }}</span>
</template>
