<script setup lang="ts">
import { OneTimeCodeSubmitter, oneTimeCodeDigits, type OneTimeCodeInputSchema } from '@alfakit/core'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Input from '../ui/Input.vue'

/**
 * `OneTimeCodeInput`: one numeric input with `autocomplete="one-time-code"` (browsers and
 * password managers fill it from an SMS or email), digits only, left to right in every
 * language. `submitOnCompletion()` submits the form once the last digit is in.
 */
const props = defineProps<{ component: OneTimeCodeInputSchema }>()
const { value, setValue, blur, error, id, disabled, aria } = useField<string | null>(
  () => props.component,
)
const submitter = new OneTimeCodeSubmitter()

const onInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const code = oneTimeCodeDigits(input.value, props.component.length)

  // A rejected character leaves the model value unchanged: correct the DOM too.
  if (code !== input.value) input.value = code

  setValue(code === '' ? null : code)

  // After the state reached the form store, so the submitted values include it.
  if (props.component.submitOnCompletion) {
    const form = input.form

    queueMicrotask(() => submitter.update(code, props.component.length, form))
  }
}
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <Input
      :id="id"
      :name="props.component.name"
      type="text"
      dir="ltr"
      inputmode="numeric"
      autocomplete="one-time-code"
      pattern="[0-9]*"
      :maxlength="props.component.length"
      :model-value="value ?? ''"
      :placeholder="props.component.placeholder"
      :disabled="disabled"
      :readonly="props.component.readOnly"
      :required="props.component.required"
      :autofocus="props.component.autofocus"
      :aria-invalid="aria['aria-invalid']"
      :aria-describedby="aria['aria-describedby']"
      :aria-required="aria['aria-required']"
      data-slot="one-time-code-input"
      class="max-w-56 text-center font-mono text-lg tracking-[0.5em] tabular-nums"
      v-bind="props.component.extraInputAttributes"
      @input="onInput"
      @blur="blur"
    />
  </FieldWrapper>
</template>
