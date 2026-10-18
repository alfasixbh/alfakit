<script setup lang="ts">
import type { FieldsetSchema } from '@alfakit/core'
import { schemaGapClass } from '@alfakit/core'
import { computed } from 'vue'
import { cn } from '../../lib/utils'
import SchemaRenderer from '../schema/SchemaRenderer.vue'
import DeferredSchema from './DeferredSchema.vue'

const props = defineProps<{ component: FieldsetSchema }>()
const contained = computed(() => props.component.contained !== false)
</script>

<template>
  <fieldset
    :data-contained="contained ? undefined : 'false'"
    :class="contained ? 'rounded-xl border p-4 pt-3' : 'min-w-0'"
    v-bind="props.component.extraAttributes"
  >
    <legend
      v-if="props.component.label"
      :class="cn('text-sm font-medium', contained ? 'px-1' : 'mb-3')"
    >
      {{ props.component.label }}
    </legend>
    <DeferredSchema v-slot="{ component: loaded }" :component="props.component">
      <SchemaRenderer
        :components="loaded.schema ?? []"
        :columns="loaded.columns"
        :class="schemaGapClass(loaded) || undefined"
      />
    </DeferredSchema>
  </fieldset>
</template>
