import type { RadioSchema } from '@alfakit/core'
import { fieldIds, isOptionGroup } from '@alfakit/core'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'

export function RadioField({ component }: { component: RadioSchema }) {
  const { value, setValue, error, id, disabled, readOnly, aria } = useField<
    string | number | boolean | null
  >(component)
  const options = component.options.flatMap((option) =>
    isOptionGroup(option) ? option.options : [option],
  )
  const current =
    value === null || value === undefined
      ? ''
      : typeof value === 'boolean'
        ? value
          ? '1'
          : '0'
        : String(value)

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <RadioGroup
        value={current}
        onValueChange={(next) => setValue(next)}
        disabled={disabled || readOnly}
        aria-readonly={readOnly || undefined}
        className={cn(component.inline && 'flex flex-wrap gap-4')}
        aria-labelledby={component.label ? fieldIds(id).label : undefined}
        {...aria}
      >
        {options.map((option) => {
          const optionId = `${id}-${option.value}`

          return (
            <div key={option.value} className="flex items-start gap-2">
              <RadioGroupItem
                id={optionId}
                value={option.value}
                disabled={option.disabled}
                className="mt-0.5"
              />
              <div className="grid gap-0.5">
                <Label
                  htmlFor={optionId}
                  className={cn('font-normal', option.color && textColorClasses[option.color])}
                >
                  {option.icon && <Icon name={option.icon} className="size-4" />}
                  {option.label}
                </Label>
                {option.description && (
                  <p className="text-muted-foreground text-xs">{option.description}</p>
                )}
              </div>
            </div>
          )
        })}
      </RadioGroup>
    </FieldWrapper>
  )
}
