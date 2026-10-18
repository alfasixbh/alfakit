<script setup lang="ts">
import { MoreHorizontal } from '@lucide/vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'
import { useT } from '../../context'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
const t = useT()
</script>

<template>
  <span
    data-slot="breadcrumb-ellipsis"
    role="presentation"
    aria-hidden="true"
    :class="cn('flex size-9 items-center justify-center', props.class)"
  >
    <MoreHorizontal class="size-4" />
    <span class="sr-only">{{ t('more', {}, 'More') }}</span>
  </span>
</template>
