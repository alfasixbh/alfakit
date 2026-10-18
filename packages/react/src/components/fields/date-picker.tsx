import {
  formatPhpDate,
  LocaleFormatter,
  timeInputStep,
  wallClockNow,
  withoutRequired,
  type DatePickerSchema,
} from '@alfakit/core'
import { format as formatDate, isValid, parse } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { useDirection, useFormatter, useLocalization, useT } from '../../context'
import { extraProps } from '../../lib/attributes'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { lazyComponent } from '../../lib/lazy'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Button } from '../ui/button'
import type { Calendar as CalendarComponent } from '../ui/calendar'
import { Input } from '../ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

/**
 * The month grid (react-day-picker) loads the first time a picker opens (or is hovered or
 * focused), not with the form.
 */
const Calendar = lazyComponent<ComponentProps<typeof CalendarComponent>>(
  () => import('../ui/calendar').then((module) => module.Calendar),
  () => <div aria-busy="true" className="h-[18.5rem] w-[15.5rem]" />,
)

/** Convert a PHP date format to a date-fns format string (common tokens only). */
export function phpToDateFnsFormat(format: string): string {
  const map: Record<string, string> = {
    d: 'dd',
    j: 'd',
    D: 'EEE',
    l: 'EEEE',
    m: 'MM',
    n: 'M',
    M: 'MMM',
    F: 'MMMM',
    Y: 'yyyy',
    y: 'yy',
    H: 'HH',
    G: 'H',
    h: 'hh',
    g: 'h',
    i: 'mm',
    s: 'ss',
    A: 'a',
    a: 'aaa',
    U: 't',
  }

  return format
    .split('')
    .map((char) => map[char] ?? (/[a-z]/i.test(char) ? `'${char}'` : char))
    .join('')
}

export function DatePickerField({ component }: { component: DatePickerSchema }) {
  const { value, setValue, blur, error, id, disabled, readOnly, aria } = useField<string | null>(
    component,
  )
  const [open, setOpen] = useState(false)

  const t = useT()
  const direction = useDirection()
  const panelFormat = useFormatter()
  const panelLocale = useLocalization()?.tag ?? 'en'
  // `locale()` overrides the panel's language for this picker only.
  const locale = component.locale ?? panelLocale
  const format = component.locale
    ? new LocaleFormatter(component.locale, panelFormat.currencyCode, panelFormat.timeZone)
    : panelFormat
  const storageFormat = phpToDateFnsFormat(component.format)

  // Month and weekday names come from Intl, so they follow the user's language.
  const display = (date: Date): string =>
    component.displayFormat
      ? formatPhpDate(date, component.displayFormat, locale)
      : format.date(date, {
          ...(component.hasDate ? { dateStyle: 'medium' as const } : {}),
          ...(component.hasTime ? { timeStyle: 'short' as const } : {}),
          timeZone: undefined,
        })

  // A time of day has nothing to pick on a calendar: use the time input on its own.
  if (component.native || !component.hasDate) {
    const nativeType = !component.hasDate ? 'time' : component.hasTime ? 'datetime-local' : 'date'
    const nativeFormat =
      nativeType === 'time'
        ? component.hasSeconds
          ? 'HH:mm:ss'
          : 'HH:mm'
        : nativeType === 'datetime-local'
          ? component.hasSeconds
            ? "yyyy-MM-dd'T'HH:mm:ss"
            : "yyyy-MM-dd'T'HH:mm"
          : 'yyyy-MM-dd'

    const parsed = value ? parse(value, storageFormat, new Date()) : null
    const nativeValue = parsed && isValid(parsed) ? formatDate(parsed, nativeFormat) : (value ?? '')
    const listId = component.datalist ? `${id}-list` : undefined

    return (
      <FieldWrapper field={component} htmlFor={id} error={error}>
        <DateAffixes component={component} error={error}>
          <Input
            id={id}
            type={nativeType}
            name={component.name}
            value={nativeValue}
            step={timeInputStep(component)}
            min={
              component.minDate
                ? toNative(component.minDate, storageFormat, nativeFormat)
                : undefined
            }
            max={
              component.maxDate
                ? toNative(component.maxDate, storageFormat, nativeFormat)
                : undefined
            }
            onChange={(event) => {
              const raw = event.target.value

              if (raw === '') {
                setValue(null)

                return
              }

              const date = parse(raw, nativeFormat, new Date())
              setValue(isValid(date) ? formatDate(date, storageFormat) : raw)
            }}
            onBlur={blur}
            disabled={disabled}
            readOnly={readOnly}
            required={component.required}
            lang={component.locale}
            list={listId}
            {...aria}
            {...extraProps(component.extraInputAttributes)}
          />
          {component.datalist && (
            <datalist id={listId}>
              {component.datalist.map((option) => (
                <option
                  key={option}
                  value={toNative(option, storageFormat, nativeFormat) ?? option}
                />
              ))}
            </datalist>
          )}
        </DateAffixes>
      </FieldWrapper>
    )
  }

  const selected = value ? parse(value, storageFormat, new Date()) : undefined
  const selectedDate = selected && isValid(selected) ? selected : undefined
  const focused = component.defaultFocusedDate
    ? parse(component.defaultFocusedDate, storageFormat, new Date())
    : undefined
  const defaultMonth = selectedDate ?? (focused && isValid(focused) ? focused : undefined)

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <DateAffixes component={component} error={error}>
        <Popover open={open} onOpenChange={(next) => setOpen(next && !readOnly)}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              data-input=""
              variant="outline"
              disabled={disabled}
              onPointerEnter={() => void Calendar.preload()}
              onFocus={() => void Calendar.preload()}
              {...withoutRequired(aria)}
              className={cn(
                'w-full justify-start font-normal',
                !selectedDate && 'text-muted-foreground',
                error && 'border-destructive',
              )}
            >
              <CalendarIcon className="size-4" />
              {selectedDate
                ? display(selectedDate)
                : (component.placeholder ?? t('form.pick_date', {}, 'Pick a date'))}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              dir={direction}
              formatters={{
                formatCaption: (month) =>
                  new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month),
                formatWeekdayName: (day) =>
                  new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day),
              }}
              selected={selectedDate}
              defaultMonth={defaultMonth}
              today={wallClockNow(component.timezone)}
              weekStartsOn={component.firstDayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6}
              disabled={[
                ...(component.minDate
                  ? [{ before: parse(component.minDate, storageFormat, new Date()) }]
                  : []),
                ...(component.maxDate
                  ? [{ after: parse(component.maxDate, storageFormat, new Date()) }]
                  : []),
                ...(component.disabledDates ?? []).map((date) =>
                  parse(date, storageFormat, new Date()),
                ),
              ]}
              onSelect={(date) => {
                if (!date) {
                  setValue(null)

                  return
                }

                const withTime = selectedDate
                  ? new Date(
                      date.getFullYear(),
                      date.getMonth(),
                      date.getDate(),
                      selectedDate.getHours(),
                      selectedDate.getMinutes(),
                      selectedDate.getSeconds(),
                    )
                  : date
                setValue(formatDate(withTime, storageFormat))

                if (component.closeOnDateSelection && !component.hasTime) {
                  setOpen(false)
                  blur()
                }
              }}
            />
            {component.hasTime && (
              <div className="border-t p-3">
                <Input
                  type="time"
                  step={timeInputStep(component)}
                  value={
                    selectedDate
                      ? formatDate(selectedDate, component.hasSeconds ? 'HH:mm:ss' : 'HH:mm')
                      : ''
                  }
                  onChange={(event) => {
                    const base = selectedDate ?? wallClockNow(component.timezone)
                    const [hours = '0', minutes = '0', seconds = '0'] =
                      event.target.value.split(':')
                    const next = new Date(
                      base.getFullYear(),
                      base.getMonth(),
                      base.getDate(),
                      Number(hours),
                      Number(minutes),
                      Number(seconds),
                    )
                    setValue(formatDate(next, storageFormat))
                  }}
                  onBlur={blur}
                />
              </div>
            )}
          </PopoverContent>
        </Popover>
      </DateAffixes>
    </FieldWrapper>
  )
}

function toNative(value: string, storageFormat: string, nativeFormat: string): string | undefined {
  const date = parse(value, storageFormat, new Date())

  return isValid(date) ? formatDate(date, nativeFormat) : undefined
}

/** Prefix/suffix text and icons (with `prefixIconColor()` / `suffixIconColor()`). */
function DateAffixes({
  component,
  error,
  children,
}: {
  component: DatePickerSchema
  error?: string
  children: ReactNode
}) {
  const hasPrefix = Boolean(component.prefix || component.prefixIcon)
  const hasSuffix = Boolean(component.suffix || component.suffixIcon)

  if (!hasPrefix && !hasSuffix) {
    return children
  }

  return (
    <div
      data-slot="input-group"
      className={cn(
        'border-input dark:bg-input/30 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-ring/50 flex min-h-9 w-full items-stretch overflow-hidden rounded-md border shadow-xs has-[:focus-visible]:ring-[3px]',
        error && 'border-destructive',
      )}
    >
      {hasPrefix && (
        <span className="text-muted-foreground bg-muted/50 flex items-center gap-1 border-e px-3 text-sm whitespace-nowrap">
          <Icon
            name={component.prefixIcon}
            className={component.prefixIconColor && textColorClasses[component.prefixIconColor]}
          />
          {component.prefix}
        </span>
      )}
      <div className="min-w-0 flex-1 *:h-full *:w-full *:rounded-none *:border-0 *:bg-transparent *:shadow-none *:focus-visible:ring-0 dark:*:bg-transparent">
        {children}
      </div>
      {hasSuffix && (
        <span className="text-muted-foreground bg-muted/50 flex items-center gap-1 border-s px-3 text-sm whitespace-nowrap">
          {component.suffix}
          <Icon
            name={component.suffixIcon}
            className={component.suffixIconColor && textColorClasses[component.suffixIconColor]}
          />
        </span>
      )}
    </div>
  )
}
