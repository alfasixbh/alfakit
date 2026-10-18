import type { ToggleSchema } from '@alfakit/core'
import {
  colorClass,
  switchOffColorClasses,
  switchOnColorClasses,
  textColorClasses,
} from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Switch } from '../ui/switch'

export function ToggleField({ component }: { component: ToggleSchema }) {
  const { value, setValue, error, id, disabled, readOnly, aria } = useField<boolean | null>(
    component,
  )
  const on = Boolean(value)
  const icon = on ? component.onIcon : component.offIcon

  return (
    <FieldWrapper field={component} htmlFor={id} error={error} inline={component.inline}>
      <div className="flex items-center gap-2">
        <Switch
          id={id}
          name={component.name}
          checked={on}
          onCheckedChange={(checked) => setValue(checked)}
          disabled={disabled || readOnly}
          aria-readonly={readOnly || undefined}
          {...aria}
          className={cn(
            component.onColor && colorClass(switchOnColorClasses, component.onColor),
            component.offColor && colorClass(switchOffColorClasses, component.offColor),
          )}
        />
        {icon && (
          <Icon
            name={icon}
            className={colorClass(
              textColorClasses,
              on ? component.onColor : component.offColor,
              'gray',
            )}
          />
        )}
      </div>
    </FieldWrapper>
  )
}
