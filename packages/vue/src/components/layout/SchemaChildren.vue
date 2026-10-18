<script setup lang="ts">
import type { BaseComponent } from '@alfakit/core'
import { schemaGapClass } from '@alfakit/core'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'
import SchemaRenderer from '../schema/SchemaRenderer.vue'

/**
 * Renders a layout component's child schema (`component.schema`) in its grid
 * (`columns`, `dense()`, `gap(false)`), for custom schema components:
 * `<SchemaChildren :component="props.component" />`.
 */
const props = defineProps<{
  component: Pick<BaseComponent, 'schema' | 'columns' | 'dense' | 'gap'>
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <SchemaRenderer
    :components="props.component.schema ?? []"
    :columns="props.component.columns"
    :class="cn(schemaGapClass(props.component), props.class)"
  />
</template>
