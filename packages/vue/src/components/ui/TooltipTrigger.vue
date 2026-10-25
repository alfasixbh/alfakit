<script setup lang="ts">
import { TooltipTrigger, type TooltipTriggerProps } from 'reka-ui'

const props = defineProps<TooltipTriggerProps>()
</script>

<template>
  <!-- With as-child the child keeps its own data-slot (an action's `button`). -->
  <TooltipTrigger
    v-bind="{ ...(props.asChild ? {} : { 'data-slot': 'tooltip-trigger' }), ...props }"
  >
    <slot />
  </TooltipTrigger>
</template>
