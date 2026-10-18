<script setup lang="ts">
import type { ViewSchema } from '@alfakit/core'
import { computed } from 'vue'
import { useRegistry, useT } from '../../context'

/** Custom component registered by the application through `createAlfakit({ components })`. */
const props = defineProps<{ component: ViewSchema }>()
const registry = useRegistry()
const t = useT()
const custom = computed(() => registry.resolve(props.component.component))
</script>

<template>
  <div
    v-if="!custom"
    class="border-destructive/40 text-destructive rounded-md border border-dashed p-3 text-xs"
  >
    {{
      t(
        'component_not_registered',
        { component: props.component.component },
        `Component ${props.component.component} is not registered.`,
      )
    }}
  </div>
  <component
    :is="custom"
    v-else
    v-bind="props.component.props ?? {}"
    :component="props.component"
  />
</template>
