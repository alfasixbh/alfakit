<script setup lang="ts">
import type { Affixes } from '@alfakit/core'
import { computed } from 'vue'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'

/** Prefix/suffix text and icons around a select or date picker (with icon colours). */
const props = defineProps<{ component: Affixes; error?: string }>()

const hasPrefix = computed(() => Boolean(props.component.prefix || props.component.prefixIcon))
const hasSuffix = computed(() => Boolean(props.component.suffix || props.component.suffixIcon))
</script>

<template>
  <div
    v-if="hasPrefix || hasSuffix"
    data-slot="input-group"
    :class="
      cn(
        'border-input dark:bg-input/30 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-ring/50 flex min-h-9 w-full items-stretch overflow-hidden rounded-md border shadow-xs has-[:focus-visible]:ring-[3px]',
        props.error && 'border-destructive',
      )
    "
  >
    <span
      v-if="hasPrefix"
      class="text-muted-foreground bg-muted/50 flex items-center gap-1 border-e px-3 text-sm whitespace-nowrap"
    >
      <Icon
        :name="props.component.prefixIcon"
        :class="
          props.component.prefixIconColor && textColorClasses[props.component.prefixIconColor]
        "
      />
      {{ props.component.prefix }}
    </span>
    <div
      class="min-w-0 flex-1 *:h-full *:w-full *:rounded-none *:border-0 *:bg-transparent *:shadow-none *:focus-visible:ring-0 dark:*:bg-transparent"
    >
      <slot />
    </div>
    <span
      v-if="hasSuffix"
      class="text-muted-foreground bg-muted/50 flex items-center gap-1 border-s px-3 text-sm whitespace-nowrap"
    >
      {{ props.component.suffix }}
      <Icon
        :name="props.component.suffixIcon"
        :class="
          props.component.suffixIconColor && textColorClasses[props.component.suffixIconColor]
        "
      />
    </span>
  </div>
  <slot v-else />
</template>
