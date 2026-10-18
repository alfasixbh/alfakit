<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core'
import {
  RadioGroupRoot,
  useForwardPropsEmits,
  type RadioGroupRootEmits,
  type RadioGroupRootProps,
} from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = defineProps<RadioGroupRootProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<RadioGroupRootEmits>()
const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class'), emits)
</script>

<template>
  <RadioGroupRoot v-bind="forwarded" data-slot="radio-group" :class="cn('grid gap-3', props.class)">
    <slot />
  </RadioGroupRoot>
</template>
