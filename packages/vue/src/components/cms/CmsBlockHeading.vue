<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

/** A block's optional heading and introduction. */
const props = defineProps<{
  heading?: string | null
  intro?: string | null
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    v-if="props.heading || props.intro"
    :class="cn('mx-auto mb-10 max-w-2xl text-center', props.class)"
  >
    <h2 v-if="props.heading" class="text-3xl font-semibold tracking-tight text-balance">
      {{ props.heading }}
    </h2>
    <p v-if="props.intro" class="text-muted-foreground mt-3 text-lg text-pretty">
      {{ props.intro }}
    </p>
  </div>
</template>
