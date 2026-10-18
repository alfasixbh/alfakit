<script setup lang="ts">
import type { Option } from '@alfakit/core'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'

/**
 * An option's icon, label and description. `allowHtml` labels were sanitised by the
 * server; `wrap: false` truncates long labels.
 */
const props = withDefaults(defineProps<{ option: Option; allowHtml?: boolean; wrap?: boolean }>(), {
  allowHtml: false,
  wrap: true,
})
</script>

<template>
  <span class="flex min-w-0 items-center gap-2">
    <Icon v-if="props.option.icon" :name="props.option.icon" />
    <span
      v-if="props.allowHtml"
      data-slot="option-label"
      :class="cn(props.wrap ? 'break-words' : 'truncate')"
      v-html="props.option.label"
    />
    <span v-else data-slot="option-label" :class="cn(props.wrap ? 'break-words' : 'truncate')">{{
      props.option.label
    }}</span>
    <span v-if="props.option.description" class="text-muted-foreground text-xs">{{
      props.option.description
    }}</span>
  </span>
</template>
