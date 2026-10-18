<script setup lang="ts">
import { addActionJustify } from '@alfakit/core'
import { cn } from '../../lib/utils'

/** The row holding the add button, aligned with `addActionAlignment()`. */
const props = defineProps<{ alignment?: string }>()

const JUSTIFY = { start: 'justify-start', center: 'justify-center', end: 'justify-end' } as const
</script>

<template>
  <div :class="cn('flex', JUSTIFY[addActionJustify(props.alignment)])" data-slot="item-add-action">
    <slot />
  </div>
</template>
