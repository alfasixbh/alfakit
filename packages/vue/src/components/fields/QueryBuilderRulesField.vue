<script setup lang="ts">
import type { FieldSchema, QueryBuilderGroup, QueryBuilderRulesSchema } from '@alfakit/core'
import { constraintPickerClasses, normalizeRuleTree } from '@alfakit/core'
import { computed } from 'vue'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import QueryBuilderGroupEditor from './QueryBuilderGroupEditor.vue'

/**
 * The query builder's rule editor: rules (constraint, operator, value) combined with
 * AND / OR, in nested groups. The tree is the field's state; the server validates it.
 */
const props = defineProps<{ component: QueryBuilderRulesSchema }>()
const { value, setValue, id, disabled, readOnly } = useField<unknown>(
  () => props.component as unknown as FieldSchema,
)
const tree = computed(() => normalizeRuleTree(value.value))
const locked = computed(() => Boolean(disabled.value || readOnly.value))
const change = (next: QueryBuilderGroup) => setValue(next)
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" hide-label>
    <div :id="id" role="group" :aria-label="props.component.label ?? undefined">
      <QueryBuilderGroupEditor
        :group="tree"
        :path="[]"
        :tree="tree"
        :constraints="props.component.constraints"
        :max-depth="props.component.maxDepth"
        :picker="constraintPickerClasses(props.component)"
        :locked="locked"
        @change="change"
      />
    </div>
  </FieldWrapper>
</template>
