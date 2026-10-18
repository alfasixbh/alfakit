<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import Skeleton from '../ui/Skeleton.vue'

/**
 * Stands in for a lazy widget or relation manager until the `alfakitLazy` deferred prop
 * brings its schema. `table` mimics a table (relation managers, table widgets).
 */
const props = withDefaults(
  defineProps<{ variant?: 'widget' | 'table'; class?: HTMLAttributes['class'] }>(),
  { variant: 'widget', class: undefined },
)
const t = useT()
</script>

<template>
  <div
    data-slot="lazy-placeholder"
    :data-variant="props.variant"
    role="status"
    aria-busy="true"
    :class="cn('bg-card flex flex-col gap-3 rounded-xl border p-6', props.class)"
  >
    <span class="sr-only">{{ t('loading', {}, 'Loading…') }}</span>
    <Skeleton class="h-5 w-1/3" />
    <template v-if="props.variant === 'table'">
      <Skeleton class="h-9 w-full" />
      <Skeleton class="h-9 w-full" />
      <Skeleton class="h-9 w-full" />
    </template>
    <Skeleton v-else class="h-20 w-full" />
  </div>
</template>
