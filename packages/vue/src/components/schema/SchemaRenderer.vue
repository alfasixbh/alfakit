<script setup lang="ts">
import type { Attributes, Breakpoints, SchemaComponent } from '@alfakit/core'
import {
  containerGridColumnsClasses,
  gridColumnsClasses,
  hasContainerBreakpoints,
} from '@alfakit/core'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'
import RenderComponent from './RenderComponent.vue'

/**
 * Renders a list of schema components in a responsive grid, resolving each component's
 * `type` through the registry.
 */
const props = defineProps<{
  components: SchemaComponent[]
  columns?: Breakpoints
  class?: HTMLAttributes['class']
  /** `extraAttributes` of the layout component that owns this grid (Grid, Group, Tab, Step). */
  attributes?: Attributes
}>()
</script>

<template>
  <!-- `@md`-style columns follow the width of this wrapper instead of the viewport. -->
  <div
    v-if="hasContainerBreakpoints(props.columns)"
    data-slot="schema-container"
    class="@container"
  >
    <div
      v-bind="props.attributes ?? {}"
      data-slot="schema"
      :class="
        cn(
          'grid gap-6',
          gridColumnsClasses(props.columns ?? { default: 1 }),
          containerGridColumnsClasses(props.columns),
          props.class,
        )
      "
    >
      <RenderComponent
        v-for="component in props.components"
        :key="component.key"
        :component="component"
      />
    </div>
  </div>
  <div
    v-else
    v-bind="props.attributes ?? {}"
    data-slot="schema"
    :class="cn('grid gap-6', gridColumnsClasses(props.columns ?? { default: 1 }), props.class)"
  >
    <RenderComponent
      v-for="component in props.components"
      :key="component.key"
      :component="component"
    />
  </div>
</template>
