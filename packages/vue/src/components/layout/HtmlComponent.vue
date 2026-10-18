<script setup lang="ts">
import type { HtmlSchema } from '@alfakit/core'

const props = defineProps<{ component: HtmlSchema }>()
</script>

<template>
  <div
    class="alfakit-prose text-sm"
    v-bind="props.component.extraAttributes"
    v-html="props.component.content"
  />
</template>
