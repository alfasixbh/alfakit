<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="command-empty" :class="cn('py-6 text-center text-sm', props.class)">
    <slot />
  </div>
</template>
