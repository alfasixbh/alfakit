import { OneTimeCodeSubmitter, oneTimeCodeDigits, type OneTimeCodeInputSchema } from '@alfakit/core'
import { useState } from 'react'
import { extraProps } from '../../lib/attributes'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Input } from '../ui/input'

/**
 * `OneTimeCodeInput`: one numeric input with `autocomplete="one-time-code"` (browsers and
 * password managers fill it from an SMS or email), digits only, left to right in every
 * language. `submitOnCompletion()` submits the form once the last digit is in.
 */
export function OneTimeCodeInputField({ component }: { component: OneTimeCodeInputSchema }) {
  const { value, setValue, blur, error, id, disabled, aria } = useField<string | null>(component)
  const [submitter] = useState(() => new OneTimeCodeSubmitter())

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <Input
        id={id}
        name={component.name}
        type="text"
        dir="ltr"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        value={value ?? ''}
        onChange={(event) => {
          const code = oneTimeCodeDigits(event.target.value, component.length)
          const form = event.currentTarget.form

          setValue(code === '' ? null : code)

          // After the state reached the form store, so the submitted values include it.
          if (component.submitOnCompletion) {
            queueMicrotask(() => submitter.update(code, component.length, form))
          }
        }}
        onBlur={blur}
        placeholder={component.placeholder}
        disabled={disabled}
        readOnly={component.readOnly}
        required={component.required}
        autoFocus={component.autofocus}
        data-slot="one-time-code-input"
        data-input=""
        {...aria}
        {...extraProps(
          component.extraInputAttributes,
          cn('max-w-56 text-center font-mono text-lg tracking-[0.5em] tabular-nums'),
        )}
      />
    </FieldWrapper>
  )
}
