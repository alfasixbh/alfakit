<script setup lang="ts">
import Tooltip from '../ui/Tooltip.vue'
import TooltipContent from '../ui/TooltipContent.vue'
import TooltipTrigger from '../ui/TooltipTrigger.vue'

/** Wraps the slotted button in a tooltip when there is `text` (ToggleButtons `tooltips()`). */
const props = defineProps<{ text?: string | null }>()
</script>

<template>
  <Tooltip v-if="props.text">
    <TooltipTrigger as-child>
      <slot />
    </TooltipTrigger>
    <TooltipContent>{{ props.text }}</TooltipContent>
  </Tooltip>
  <slot v-else />
</template>
