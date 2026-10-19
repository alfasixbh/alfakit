import type { ColorPickerSchema } from '@alfakit/core'
import { colorAlpha, colorToHex, formatColor, withColorAlpha } from '@alfakit/core'
import { useFormatter, useT } from '../../context'
import { extraProps } from '../../lib/attributes'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Input } from '../ui/input'

export function ColorPickerField({ component }: { component: ColorPickerSchema }) {
  const t = useT()
  const format = useFormatter()
  const { value, setValue, blur, error, id, disabled, readOnly, aria } = useField<string | null>(
    component,
  )
  const isHex = component.format === 'hex'
  // `rgba()`: the native swatch has no alpha, so a slider sets the opacity.
  const alpha = Math.round(colorAlpha(value) * 100)

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <div className="flex items-center gap-2">
        <label
          className="border-input relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs"
          style={{ backgroundColor: value ?? 'transparent' }}
          aria-label={t('form.pick_color', {}, 'Pick a colour')}
        >
          <input
            type="color"
            value={colorToHex(value) ?? '#000000'}
            onChange={(event) => setValue(formatColor(event.target.value, component.format, value))}
            onBlur={blur}
            disabled={disabled || readOnly}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
        <Input
          id={id}
          name={component.name}
          dir="ltr"
          value={value ?? ''}
          onChange={(event) => setValue(event.target.value)}
          onBlur={blur}
          placeholder={component.placeholder ?? (isHex ? '#000000' : component.format)}
          disabled={disabled}
          readOnly={readOnly}
          {...aria}

          {...extraProps(component.extraInputAttributes, 'font-mono')}
        />
      </div>
      {component.format === 'rgba' && (
        <div data-slot="color-picker-alpha" className="mt-2 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={alpha}
            onChange={(event) => setValue(withColorAlpha(value, Number(event.target.value) / 100))}
            onBlur={blur}
            disabled={disabled || readOnly}
            aria-label={t('form.color_opacity', {}, 'Opacity')}
            aria-valuetext={`${alpha}%`}
            className="accent-primary h-2 flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="text-muted-foreground w-10 text-end text-xs tabular-nums">
            {format.percent(alpha / 100)}
          </span>
        </div>
      )}
    </FieldWrapper>
  )
}
