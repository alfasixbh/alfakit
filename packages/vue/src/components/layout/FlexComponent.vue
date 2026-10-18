<script setup lang="ts">
import type { FlexSchema } from '@alfakit/core'
import { flexItemClasses, flexLayoutClasses, schemaGapClass } from '@alfakit/core'
import { cn } from '../../lib/utils'
import RenderComponent from '../schema/RenderComponent.vue'

const props = defineProps<{ component: FlexSchema }>()
</script>

<template>
  <div
    data-slot="flex"
    :class="cn(flexLayoutClasses(props.component), schemaGapClass(props.component))"
    v-bind="props.component.extraAttributes"
  >
    <div
      v-for="child in props.component.schema ?? []"
      :key="child.key"
      data-slot="flex-item"
      :class="flexItemClasses(child)"
    >
      <RenderComponent :component="child" />
    </div>
  </div>
</template>
