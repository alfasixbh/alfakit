import type { CheckboxSchema } from '@alfakit/core'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Checkbox } from '../ui/checkbox'

export function CheckboxField({ component }: { component: CheckboxSchema }) {
  const { value, setValue, error, id, disabled, readOnly, aria } = useField<boolean | null>(
    component,
  )

  return (
    <FieldWrapper field={component} htmlFor={id} error={error} inline={component.inline}>
      <Checkbox
        id={id}
        name={component.name}
        checked={Boolean(value)}
        onCheckedChange={(checked) => setValue(checked === true)}
        disabled={disabled || readOnly}
        aria-readonly={readOnly || undefined}
        required={component.required}
        {...aria}
        className="mt-0.5"
      />
    </FieldWrapper>
  )
}
