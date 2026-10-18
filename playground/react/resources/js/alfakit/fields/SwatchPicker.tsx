import { FieldWrapper, cn, useField, useT } from '@alfakit/react'
import type { SwatchPickerProps } from '../types'

/**
 * App\Alfakit\Forms\Components\SwatchPicker. Auto-registered as `SwatchPicker` from this
 * file's path; `SwatchPickerProps` comes from `php artisan alfakit:types`.
 */
export default function SwatchPicker({ component }: SwatchPickerProps) {
    const { value, setValue, blur, error, id, disabled, aria } = useField<string | null>(component)
    const t = useT()
    // App strings shared through Panel::frontendTranslations(['playground' => 'playground.frontend']).
    const selected = component.swatches.find((swatch) => swatch.value === value)

    return (
        <FieldWrapper field={component} htmlFor={id} error={error}>
            <div
                id={id}
                role="radiogroup"
                aria-label={component.label}
                data-slot="swatch-picker"
                className="flex flex-wrap gap-2"
                {...aria}
            >
                {component.swatches.map((swatch) => (
                    <button
                        key={swatch.value}
                        type="button"
                        role="radio"
                        aria-checked={value === swatch.value}
                        aria-label={swatch.label}
                        title={swatch.label}
                        disabled={disabled}
                        onClick={() => setValue(swatch.value)}
                        onBlur={blur}
                        className={cn(
                            'ring-offset-background focus-visible:ring-ring size-8 rounded-full border-2 border-transparent ring-offset-2 outline-none focus-visible:ring-2',
                            value === swatch.value && 'border-foreground',
                        )}
                        style={{ backgroundColor: swatch.value }}
                    />
                ))}
            </div>
            <span className="sr-only" aria-live="polite">
                {selected
                    ? t(
                          'playground.swatch_picker.selected',
                          { label: selected.label },
                          `Selected colour: ${selected.label}`,
                      )
                    : t('playground.swatch_picker.none', {}, 'No colour selected')}
            </span>
        </FieldWrapper>
    )
}
