<script setup lang="ts">
import { TabsList, type TabsListProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = defineProps<TabsListProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <TabsList
    data-slot="tabs-list"
    :loop="props.loop"
    :class="
      cn(
        'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px] data-[orientation=vertical]:h-auto data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
        props.class,
      )
    "
  >
    <slot />
  </TabsList>
</template>
