<script setup lang="ts">
import type { GridSchema, GroupSchema } from '@alfakit/core'
import { schemaGapClass } from '@alfakit/core'
import SchemaRenderer from '../schema/SchemaRenderer.vue'
import DeferredSchema from './DeferredSchema.vue'

const props = defineProps<{ component: GridSchema | GroupSchema }>()
</script>

<template>
  <DeferredSchema v-slot="{ component: loaded }" :component="props.component">
    <SchemaRenderer
      :components="loaded.schema ?? []"
      :columns="loaded.columns"
      :attributes="loaded.extraAttributes"
      :class="schemaGapClass(loaded) || undefined"
    />
  </DeferredSchema>
</template>
