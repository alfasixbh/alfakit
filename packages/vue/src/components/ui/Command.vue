<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core'
import {
  ListboxRoot,
  useForwardPropsEmits,
  type ListboxRootEmits,
  type ListboxRootProps,
} from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = withDefaults(defineProps<ListboxRootProps & { class?: HTMLAttributes['class'] }>(), {
  selectionBehavior: 'replace',
})
const emits = defineEmits<ListboxRootEmits>()
const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class'), emits)
</script>

<template>
  <ListboxRoot
    v-bind="forwarded"
    data-slot="command"
    :class="
      cn(
        'bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md',
        props.class,
      )
    "
  >
    <slot />
  </ListboxRoot>
</template>
