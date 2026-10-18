<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

// Attributes (`aria-rowcount`, data hooks) belong to the table, not the scroll container.
defineOptions({ inheritAttrs: false })
const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="table-container" class="relative w-full overflow-x-auto">
    <table
      data-slot="table"
      :class="cn('w-full caption-bottom text-sm', props.class)"
      v-bind="$attrs"
    >
      <slot />
    </table>
  </div>
</template>
