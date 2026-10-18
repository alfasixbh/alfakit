<script lang="ts">
  import {
    OneTimeCodeSubmitter,
    oneTimeCodeDigits,
    type OneTimeCodeInputSchema,
  } from '@alfakit/core'
  import { extraProps } from '../../lib/attributes'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Input } from '../ui/input'

  /**
   * `OneTimeCodeInput`: one numeric input with `autocomplete="one-time-code"` (browsers and
   * password managers fill it from an SMS or email), digits only, left to right in every
   * language. `submitOnCompletion()` submits the form once the last digit is in.
   */
  let { component }: { component: OneTimeCodeInputSchema } = $props()

  const field = useField<string | null>(() => component)
  const submitter = new OneTimeCodeSubmitter()

  const onInput = (input: HTMLInputElement) => {
    const code = oneTimeCodeDigits(input.value, component.length)

    // A rejected character leaves the bound value unchanged: correct the DOM too.
    if (code !== input.value) input.value = code

    field.setValue(code === '' ? null : code)

    // After the state reached the form store, so the submitted values include it.
    if (component.submitOnCompletion) {
      const form = input.form

      queueMicrotask(() => submitter.update(code, component.length, form))
    }
  }
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <Input
    id={field.id}
    name={component.name}
    type="text"
    dir="ltr"
    inputmode="numeric"
    autocomplete="one-time-code"
    pattern="[0-9]*"
    maxlength={component.length}
    value={field.value ?? ''}
    oninput={(event) => onInput(event.currentTarget)}
    onblur={field.blur}
    placeholder={component.placeholder}
    disabled={field.disabled}
    readonly={component.readOnly}
    required={component.required}
    autofocus={component.autofocus || undefined}
    data-slot="one-time-code-input"
    {...field.aria}
    {...extraProps(
      component.extraInputAttributes,
      'max-w-56 text-center font-mono text-lg tracking-[0.5em] tabular-nums',
    )}
  />
</FieldWrapper>
