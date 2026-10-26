import type { MoneyInputSchema } from '@alfakit/core'
import { useState } from 'react'
import { useFormatter } from '../../context'
import { extraProps } from '../../lib/attributes'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Input } from '../ui/input'

/**
 * Amount input for any ISO 4217 currency. Shows the symbol where the user's locale puts
 * it, accepts the locale's separators and digits ("1.234,50", "١٢٫٥"), and rounds to
 * the currency's precision on blur. The form value is a plain decimal string ("1234.50").
 */
export function MoneyInputField({ component }: { component: MoneyInputSchema }) {
  const { value, setValue, blur, error, id, disabled, aria } = useField<string | number | null>(
    component,
  )
  const format = useFormatter()
  const [draft, setDraft] = useState<string | null>(null)

  const { prefix, suffix } = format.currencyAffixes(component.currency)
  const amount = value === null || value === undefined || value === '' ? null : Number(value)
  const display =
    amount === null || Number.isNaN(amount)
      ? String(value ?? '')
      : format.number(amount, {
          minimumFractionDigits: component.decimals,
          maximumFractionDigits: component.decimals,
        })

  const commit = (text: string) => {
    if (text.trim() === '') {
      setValue(null)

      return
    }

    const parsed = format.parseNumber(text)

    // Unparseable input is kept as typed and out-of-range amounts are kept as well, so the
    // server's `minValue()` / `maxValue()` rules report them (W-V3-11).
    setValue(parsed === null ? text : parsed.toFixed(component.decimals))
  }

  const affix = (text: string, icon: string | undefined, side: 'start' | 'end') =>
    text || icon ? (
      <span
        className={cn(
          'text-muted-foreground bg-muted/50 flex items-center gap-1 px-3 text-sm whitespace-nowrap',
          side === 'start' ? 'border-e' : 'border-s',
        )}
      >
        {side === 'start' && <Icon name={icon} />}
        {text}
        {side === 'end' && <Icon name={icon} />}
      </span>
    ) : null

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <div
        data-slot="input-group"
        className={cn(
          'border-input dark:bg-input/30 has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-ring/50 flex h-9 w-full items-stretch overflow-hidden rounded-md border shadow-xs has-[input:focus-visible]:ring-[3px]',
          error && 'border-destructive',
          disabled && 'opacity-50',
        )}
      >
        {affix([component.prefix, prefix].filter(Boolean).join(' '), component.prefixIcon, 'start')}
        <Input
          id={id}
          name={component.name}
          type="text"
          inputMode={component.decimals > 0 ? 'decimal' : 'numeric'}
          dir="ltr"
          value={draft ?? display}
          onFocus={() =>
            setDraft(
              amount === null || Number.isNaN(amount)
                ? String(value ?? '')
                : format.number(amount, {
                    useGrouping: false,
                    maximumFractionDigits: component.decimals,
                  }),
            )
          }
          onChange={(event) => {
            setDraft(event.target.value)
            const parsed = format.parseNumber(event.target.value)
            setValue(
              event.target.value.trim() === ''
                ? null
                : parsed === null
                  ? event.target.value
                  : String(parsed),
            )
          }}
          onBlur={(event) => {
            commit(event.target.value)
            setDraft(null)
            blur()
          }}
          placeholder={component.placeholder}
          disabled={disabled}
          readOnly={component.readOnly}
          required={component.required}
          autoFocus={component.autofocus}
          {...aria}

          {...extraProps(
            component.extraInputAttributes,
            'h-full border-0 bg-transparent text-end tabular-nums shadow-none focus-visible:ring-0 dark:bg-transparent',
          )}
        />
        {affix([suffix, component.suffix].filter(Boolean).join(' '), component.suffixIcon, 'end')}
      </div>
    </FieldWrapper>
  )
}
