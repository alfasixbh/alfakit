import type { TextareaSchema } from '@alfakit/core'
import { extraProps } from '../../lib/attributes'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Textarea } from '../ui/textarea'

export function TextareaField({ component }: { component: TextareaSchema }) {
  const { value, setValue, blur, error, id, disabled, aria } = useField<string | null>(component)

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <Textarea
        dir="auto"
        id={id}
        name={component.name}
        value={value ?? ''}
        onChange={(event) => setValue(event.target.value)}
        onBlur={blur}
        placeholder={component.placeholder}
        disabled={disabled}
        readOnly={component.readOnly}
        required={component.required}
        autoFocus={component.autofocus}
        rows={component.rows}
        cols={component.cols}
        minLength={component.minLength}
        maxLength={component.maxLength}
        {...aria}

        {...extraProps(
          component.extraInputAttributes,
          component.autosize ? 'field-sizing-content' : undefined,
        )}
      />
    </FieldWrapper>
  )
}
