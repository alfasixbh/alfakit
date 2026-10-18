<script setup lang="ts">
import type { PlaceholderSchema } from '@alfakit/core'
import Label from '../ui/Label.vue'

const props = defineProps<{ component: PlaceholderSchema }>()
</script>

<template>
  <div data-slot="field" class="flex flex-col gap-1.5" v-bind="props.component.extraAttributes">
    <Label v-if="props.component.label">{{ props.component.label }}</Label>
    <div class="text-sm leading-6" v-html="props.component.content ?? ''" />
    <p v-if="props.component.helperText" class="text-muted-foreground text-xs">
      {{ props.component.helperText }}
    </p>
  </div>
</template>
