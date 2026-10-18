<script lang="ts" module>
  import type { ComponentProps } from 'svelte'
  import { lazyLoader } from '../../lib/lazy'
  import type CalendarComponent from '../ui/calendar/Calendar.svelte'

  // The month grid loads the first time a picker opens (or is hovered or focused), not with
  // the form.
  const calendar = lazyLoader<ComponentProps<typeof CalendarComponent>>(() =>
    import('../ui/calendar/Calendar.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import {
    formatPhpDate,
    LocaleFormatter,
    timeInputStep,
    wallClockNow,
    withoutRequired,
    type DatePickerSchema,
  } from '@alfakit/core'
  import { CalendarDate, getLocalTimeZone, type DateValue } from '@internationalized/date'
  import CalendarIcon from '@lucide/svelte/icons/calendar'
  import { format as formatDate, isValid, parse } from 'date-fns'
  import { useDirection, useFormatter, useLocalization, useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Button } from '../ui/button'
  import Lazy from '../../lib/Lazy.svelte'
  import { Input } from '../ui/input'
  import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
  import { phpToDateFnsFormat } from './date-format'
  import SelectAffixes from './SelectAffixes.svelte'

  let { component }: { component: DatePickerSchema } = $props()

  const field = useField<string | null>(() => component)
  let open = $state(false)

  const t = useT()
  const panelFormat = useFormatter()
  const direction = $derived(useDirection())
  const panelLocale = $derived(useLocalization()?.tag ?? 'en')
  // `locale()` overrides the panel's language for this picker only.
  const locale = $derived(component.locale ?? panelLocale)
  const format = $derived({
    current: component.locale
      ? new LocaleFormatter(
          component.locale,
          panelFormat.current.currencyCode,
          panelFormat.current.timeZone,
        )
      : panelFormat.current,
  })
  const listId = $derived(component.datalist ? `${field.id}-list` : undefined)

  const storageFormat = $derived(phpToDateFnsFormat(component.format))

  // Month and weekday names come from Intl, so they follow the user's language.
  const display = (date: Date): string =>
    component.displayFormat
      ? formatPhpDate(date, component.displayFormat, locale)
      : format.current.date(date, {
          ...(component.hasDate ? { dateStyle: 'medium' as const } : {}),
          ...(component.hasTime ? { timeStyle: 'short' as const } : {}),
          timeZone: undefined,
        })

  const nativeType = $derived(
    !component.hasDate ? 'time' : component.hasTime ? 'datetime-local' : 'date',
  )
  const nativeFormat = $derived(
    nativeType === 'time'
      ? component.hasSeconds
        ? 'HH:mm:ss'
        : 'HH:mm'
      : nativeType === 'datetime-local'
        ? component.hasSeconds
          ? "yyyy-MM-dd'T'HH:mm:ss"
          : "yyyy-MM-dd'T'HH:mm"
        : 'yyyy-MM-dd',
  )

  const parsed = $derived(field.value ? parse(field.value, storageFormat, new Date()) : null)
  const selectedDate = $derived(parsed && isValid(parsed) ? parsed : undefined)
  const nativeValue = $derived(
    selectedDate ? formatDate(selectedDate, nativeFormat) : (field.value ?? ''),
  )

  const toNative = (value: string): string | undefined => {
    const date = parse(value, storageFormat, new Date())

    return isValid(date) ? formatDate(date, nativeFormat) : undefined
  }

  const toCalendarDate = (date: Date): CalendarDate =>
    new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const parseStorage = (value: string): Date => parse(value, storageFormat, new Date())

  const calendarValue = $derived(selectedDate ? toCalendarDate(selectedDate) : undefined)
  const minValue = $derived(
    component.minDate && isValid(parseStorage(component.minDate))
      ? toCalendarDate(parseStorage(component.minDate))
      : undefined,
  )
  const maxValue = $derived(
    component.maxDate && isValid(parseStorage(component.maxDate))
      ? toCalendarDate(parseStorage(component.maxDate))
      : undefined,
  )
  const disabledDates = $derived(
    (component.disabledDates ?? []).map((date) => formatDate(parseStorage(date), 'yyyy-MM-dd')),
  )

  // `defaultFocusedDate()`: the month the calendar opens on while the field is empty.
  const focusedDate = $derived.by(() => {
    if (!component.defaultFocusedDate) return undefined

    const date = parseStorage(component.defaultFocusedDate)

    return isValid(date) ? toCalendarDate(date) : undefined
  })
  const step = $derived(timeInputStep(component))

  const isDateDisabled = (date: DateValue) =>
    disabledDates.includes(formatDate(date.toDate(getLocalTimeZone()), 'yyyy-MM-dd'))

  const onNativeInput = (raw: string) => {
    if (raw === '') {
      field.setValue(null)

      return
    }

    const date = parse(raw, nativeFormat, new Date())
    field.setValue(isValid(date) ? formatDate(date, storageFormat) : raw)
  }

  const onCalendarChange = (value: DateValue | undefined) => {
    if (!value) {
      field.setValue(null)

      return
    }

    const date = value.toDate(getLocalTimeZone())
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
    field.setValue(formatDate(withTime, storageFormat))

    if (component.closeOnDateSelection && !component.hasTime) {
      open = false
      field.blur()
    }
  }

  const onTimeInput = (raw: string) => {
    const base = selectedDate ?? wallClockNow(component.timezone)
    const [hours = '0', minutes = '0', seconds = '0'] = raw.split(':')
    const next = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      Number(hours),
      Number(minutes),
      Number(seconds),
    )
    field.setValue(formatDate(next, storageFormat))
  }
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <SelectAffixes {component} error={field.error}>
    <!-- A time of day has nothing to pick on a calendar: use the time input on its own. -->
    {#if component.native || !component.hasDate}
      <Input
        id={field.id}
        type={nativeType}
        name={component.name}
        value={nativeValue}
        {step}
        min={component.minDate ? toNative(component.minDate) : undefined}
        max={component.maxDate ? toNative(component.maxDate) : undefined}
        oninput={(event) => onNativeInput(event.currentTarget.value)}
        onblur={field.blur}
        disabled={field.disabled}
        readonly={field.readOnly}
        required={component.required}
        lang={component.locale}
        list={listId}
        {...field.aria}
        {...component.extraInputAttributes}
      />
      {#if component.datalist}
        <datalist id={listId}>
          {#each component.datalist as option (option)}
            <option value={toNative(option) ?? option}></option>
          {/each}
        </datalist>
      {/if}
    {:else}
      <Popover bind:open={() => open, (next) => (open = next && !field.readOnly)}>
        <PopoverTrigger id={field.id}>
          {#snippet child({ props })}
            <Button
              type="button"
              variant="outline"
              data-input=""
              disabled={field.disabled}
              onpointerenter={() => void calendar.load()}
              onfocus={() => void calendar.load()}
              {...withoutRequired(field.aria)}
              class={cn(
                'w-full justify-start font-normal',
                !selectedDate && 'text-muted-foreground',
                field.error && 'border-destructive',
              )}
              {...props}
            >
              <CalendarIcon class="size-4" />
              {selectedDate
                ? display(selectedDate)
                : (component.placeholder ?? t('form.pick_date', {}, 'Pick a date'))}
            </Button>
          {/snippet}
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0" align="start">
          <Lazy
            loader={calendar}
            props={{
              value: calendarValue,
              onValueChange: onCalendarChange,
              locale,
              dir: direction,
              today: toCalendarDate(wallClockNow(component.timezone)),
              weekStartsOn: component.firstDayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
              minValue,
              maxValue,
              placeholder: calendarValue ?? focusedDate,
              isDateDisabled,
            }}
          >
            {#snippet fallback()}
              <div aria-busy="true" class="h-[18.5rem] w-[15.5rem]"></div>
            {/snippet}
          </Lazy>
          {#if component.hasTime}
            <div class="border-t p-3">
              <Input
                type="time"
                {step}
                value={selectedDate
                  ? formatDate(selectedDate, component.hasSeconds ? 'HH:mm:ss' : 'HH:mm')
                  : ''}
                oninput={(event) => onTimeInput(event.currentTarget.value)}
                onblur={field.blur}
              />
            </div>
          {/if}
        </PopoverContent>
      </Popover>
    {/if}
  </SelectAffixes>
</FieldWrapper>
