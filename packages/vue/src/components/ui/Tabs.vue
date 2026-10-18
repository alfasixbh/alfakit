<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core'
import { TabsRoot, useForwardPropsEmits, type TabsRootEmits, type TabsRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = defineProps<TabsRootProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<TabsRootEmits>()
const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class'), emits)
</script>

<template>
  <TabsRoot
    v-bind="forwarded"
    data-slot="tabs"
    :class="cn('flex gap-2 data-[orientation=horizontal]:flex-col', props.class)"
  >
    <slot />
  </TabsRoot>
</template>
