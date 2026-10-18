<script setup lang="ts">
import type { CheckboxSchema } from '@alfakit/core'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Checkbox from '../ui/Checkbox.vue'

const props = defineProps<{ component: CheckboxSchema }>()
const { value, setValue, error, id, disabled, readOnly, aria } = useField<boolean | null>(
  () => props.component,
)
</script>

<template>
  <FieldWrapper
    :field="props.component"
    :html-for="id"
    :error="error"
    :inline="props.component.inline"
  >
    <Checkbox
      :id="id"
      :name="props.component.name"
      :model-value="Boolean(value)"
      :disabled="disabled || readOnly"
      :aria-readonly="readOnly || undefined"
      :required="props.component.required"
      :aria-invalid="aria['aria-invalid']"
      :aria-describedby="aria['aria-describedby']"
      :aria-required="aria['aria-required']"
      class="mt-0.5"
      @update:model-value="setValue($event === true)"
    />
  </FieldWrapper>
</template>
