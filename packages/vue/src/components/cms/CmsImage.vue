<script setup lang="ts">
import type { CmsImageSchema } from '@alfakit/core'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

/** A lazily loaded image with its alternative text; decorative images get `alt=""`. */
const props = defineProps<{
  image: CmsImageSchema | null | undefined
  class?: HTMLAttributes['class']
  sizes?: string
  eager?: boolean
}>()
</script>

<template>
  <img
    v-if="props.image"
    :src="props.image.url"
    :alt="props.image.alt ?? ''"
    :loading="props.eager ? 'eager' : 'lazy'"
    decoding="async"
    :sizes="props.sizes"
    :class="cn('h-auto max-w-full', props.class)"
    data-slot="cms-image"
  />
</template>
