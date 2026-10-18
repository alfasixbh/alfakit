import { applyMask, type TextInputSchema } from '@alfakit/core'
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useT } from '../../context'
import { extraProps } from '../../lib/attributes'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

/** Values that are always written left to right, even in an RTL interface. */
const LTR_INPUT_TYPES = new Set(['email', 'url', 'tel', 'password', 'number'])

export function TextInputField({ component }: { component: TextInputSchema }) {
  const { value, setValue, blur, error, id, disabled, aria } = useField<string | number | null>(
    component,
  )
  const t = useT()
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  const copy = () => {
    const text = value === null || value === undefined ? '' : String(value)

    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(
        () => setCopied(false),
        component.copyMessageDuration ?? 1500,
      )
    })
  }

  const type = component.inputType === 'password' && revealed ? 'text' : component.inputType
  const hasAffixes =
    component.prefix ||
    component.suffix ||
    component.prefixIcon ||
    component.suffixIcon ||
    component.revealable ||
    component.copyable
  const listId = component.datalist ? `${id}-list` : undefined

  const input = (
    <Input
      id={id}
      name={component.name}
      type={type}
      dir={LTR_INPUT_TYPES.has(component.inputType) ? 'ltr' : 'auto'}
      value={value ?? ''}
      onChange={(event) => setValue(applyMask(event.target.value, component.mask))}
      onBlur={blur}
      placeholder={component.placeholder}
      disabled={disabled}
      readOnly={component.readOnly}
      required={component.required}
      autoFocus={component.autofocus}
      minLength={component.minLength}
      maxLength={component.maxLength}
      min={component.min}
      max={component.max}
      step={component.step}
      autoComplete={component.autocomplete}
      inputMode={component.inputMode as React.HTMLAttributes<HTMLInputElement>['inputMode']}
      list={listId}
      autoCapitalize={component.autocapitalize}
      {...aria}

      {...extraProps(
        component.extraInputAttributes,
        cn(
          hasAffixes &&
            'h-full border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent',
        ),
      )}
    />
  )

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      {hasAffixes ? (
        <div
          data-slot="input-group"
          className={cn(
            'border-input dark:bg-input/30 has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-ring/50 flex h-9 w-full items-stretch overflow-hidden rounded-md border shadow-xs has-[input:focus-visible]:ring-[3px]',
            error && 'border-destructive',
          )}
        >
          {(component.prefix || component.prefixIcon) && (
            <span className="text-muted-foreground bg-muted/50 flex items-center gap-1 border-e px-3 text-sm">
              <Icon
                name={component.prefixIcon}
                className={component.prefixIconColor && textColorClasses[component.prefixIconColor]}
              />
              {component.prefix}
            </span>
          )}
          {input}
          {(component.suffix || component.suffixIcon) && (
            <span className="text-muted-foreground bg-muted/50 flex items-center gap-1 border-s px-3 text-sm">
              {component.suffix}
              <Icon
                name={component.suffixIcon}
                className={component.suffixIconColor && textColorClasses[component.suffixIconColor]}
              />
            </span>
          )}
          {component.revealable && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="my-auto me-1"
              onClick={() => setRevealed((state) => !state)}
              aria-label={
                revealed
                  ? t('form.hide_password', {}, 'Hide password')
                  : t('form.show_password', {}, 'Show password')
              }
            >
              {revealed ? (
                <Icon
                  name="alfakit::forms.components.text-input.actions.hide-password"
                  fallback={EyeOffIcon}
                />
              ) : (
                <Icon
                  name="alfakit::forms.components.text-input.actions.show-password"
                  fallback={EyeIcon}
                />
              )}
            </Button>
          )}
          {component.copyable && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="my-auto me-1"
              data-slot="copy-button"
              onClick={copy}
              aria-label={t('copy', {}, 'Copy')}
            >
              {copied ? (
                <CheckIcon />
              ) : (
                <Icon
                  name="alfakit::forms.components.text-input.actions.copy"
                  fallback={CopyIcon}
                />
              )}
            </Button>
          )}
        </div>
      ) : (
        input
      )}
      {component.copyable && copied && (
        <span role="status" className={cn('text-xs', !component.copyMessage && 'sr-only')}>
          {component.copyMessage ?? t('copied', {}, 'Copied')}
        </span>
      )}
      {component.datalist && (
        <datalist id={listId}>
          {component.datalist.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
    </FieldWrapper>
  )
}
