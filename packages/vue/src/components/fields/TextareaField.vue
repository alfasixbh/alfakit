<script setup lang="ts">
import type { TextareaSchema } from '@alfakit/core'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Textarea from '../ui/Textarea.vue'

const props = defineProps<{ component: TextareaSchema }>()
const { value, setValue, blur, error, id, disabled, aria } = useField<string | null>(
  () => props.component,
)
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <Textarea
      :id="id"
      dir="auto"
      :name="props.component.name"
      :model-value="value ?? ''"
      :placeholder="props.component.placeholder"
      :disabled="disabled"
      :readonly="props.component.readOnly"
      :required="props.component.required"
      :autofocus="props.component.autofocus"
      :rows="props.component.rows"
      :cols="props.component.cols"
      :minlength="props.component.minLength"
      :maxlength="props.component.maxLength"
      :aria-invalid="aria['aria-invalid']"
      :aria-describedby="aria['aria-describedby']"
      :aria-required="aria['aria-required']"
      :class="props.component.autosize ? 'field-sizing-content' : undefined"
      v-bind="props.component.extraInputAttributes"
      @update:model-value="setValue($event)"
      @blur="blur"
    />
  </FieldWrapper>
</template>
