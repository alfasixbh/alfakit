<script setup lang="ts">
import { DropdownMenuLabel, type DropdownMenuLabelProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = defineProps<
  DropdownMenuLabelProps & { class?: HTMLAttributes['class']; inset?: boolean }
>()
</script>

<template>
  <DropdownMenuLabel
    data-slot="dropdown-menu-label"
    :data-inset="props.inset ? '' : undefined"
    :class="cn('px-2 py-1.5 text-sm font-medium data-[inset]:ps-8', props.class)"
  >
    <slot />
  </DropdownMenuLabel>
</template>
