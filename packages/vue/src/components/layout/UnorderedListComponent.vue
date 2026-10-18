<script setup lang="ts">
import type { UnorderedListSchema } from '@alfakit/core'
import { cn } from '../../lib/utils'
import RenderComponent from '../schema/RenderComponent.vue'

const SIZES: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
}

const props = defineProps<{ component: UnorderedListSchema }>()
</script>

<template>
  <ul
    data-slot="unordered-list"
    :class="
      cn(
        'marker:text-muted-foreground flex list-disc flex-col gap-1 ps-5',
        SIZES[props.component.size ?? 'sm'] ?? 'text-sm',
      )
    "
    v-bind="props.component.extraAttributes"
  >
    <li v-for="child in props.component.schema ?? []" :key="child.key">
      <RenderComponent :component="child" />
    </li>
  </ul>
</template>
