<script lang="ts">
import { defineComponent, h } from 'vue'
import { lazyComponent } from '../../lib/lazy'

// The month grid (reka-ui) loads the first time a picker opens (or is hovered or focused),
// not with the form.
const loadCalendar = () => import('../ui/Calendar.vue').then((module) => module.default)
const Calendar = lazyComponent(
  'AlfakitCalendar',
  loadCalendar,
  defineComponent({
    name: 'AlfakitCalendarLoading',
    inheritAttrs: false,
    render: () => h('div', { 'aria-busy': 'true', class: 'h-[18.5rem] w-[15.5rem]' }),
  }),
)
</script>

<script setup lang="ts">
import {
  formatPhpDate,
  LocaleFormatter,
  timeInputStep,
  wallClockNow,
  type DatePickerSchema,
} from '@alfakit/core'
import { CalendarDate, type DateValue } from '@internationalized/date'
import { CalendarIcon } from '@lucide/vue'
import { format as formatDate, isValid, parse } from 'date-fns'
import { computed, ref } from 'vue'
import { useDirection, useFormatter, useLocalization, useT } from '../../context'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Button from '../ui/Button.vue'
import Input from '../ui/Input.vue'
import Popover from '../ui/Popover.vue'
import PopoverContent from '../ui/PopoverContent.vue'
import PopoverTrigger from '../ui/PopoverTrigger.vue'
import { phpToDateFnsFormat } from './date-format'
import SelectAffixes from './SelectAffixes.vue'

const props = defineProps<{ component: DatePickerSchema }>()
const { value, setValue, blur, error, id, disabled, readOnly, aria } = useField<string | null>(
  () => props.component,
)
const open = ref(false)

const storageFormat = computed(() => phpToDateFnsFormat(props.component.format))
const t = useT()
const direction = useDirection()
const panelFormat = useFormatter()
const localization = useLocalization()
// `locale()` overrides the panel's language for this picker only.
const locale = computed(() => props.component.locale ?? localization.value?.tag ?? 'en')
const format = computed(() =>
  props.component.locale
    ? new LocaleFormatter(
        props.component.locale,
        panelFormat.value.currencyCode,
        panelFormat.value.timeZone,
      )
    : panelFormat.value,
)
const listId = computed(() => (props.component.datalist ? `${id}-list` : undefined))

// Month and weekday names come from Intl, so they follow the user's language.
const display = (date: Date): string =>
  props.component.displayFormat
    ? formatPhpDate(date, props.component.displayFormat, locale.value)
    : format.value.date(date, {
        ...(props.component.hasDate ? { dateStyle: 'medium' as const } : {}),
        ...(props.component.hasTime ? { timeStyle: 'short' as const } : {}),
        timeZone: undefined,
      })

const nativeType = computed(() =>
  !props.component.hasDate ? 'time' : props.component.hasTime ? 'datetime-local' : 'date',
)
const nativeFormat = computed(() =>
  nativeType.value === 'time'
    ? props.component.hasSeconds
      ? 'HH:mm:ss'
      : 'HH:mm'
    : nativeType.value === 'datetime-local'
      ? props.component.hasSeconds
        ? "yyyy-MM-dd'T'HH:mm:ss"
        : "yyyy-MM-dd'T'HH:mm"
      : 'yyyy-MM-dd',
)

const parsed = computed(() =>
  value.value ? parse(value.value, storageFormat.value, new Date()) : null,
)
const selectedDate = computed(() =>
  parsed.value && isValid(parsed.value) ? parsed.value : undefined,
)
const nativeValue = computed(() =>
  selectedDate.value ? formatDate(selectedDate.value, nativeFormat.value) : (value.value ?? ''),
)

function toNative(raw: string): string | undefined {
  const date = parse(raw, storageFormat.value, new Date())

  return isValid(date) ? formatDate(date, nativeFormat.value) : undefined
}

function parseStored(raw: string): Date {
  return parse(raw, storageFormat.value, new Date())
}

const onNativeInput = (raw: string) => {
  if (raw === '') {
    setValue(null)

    return
  }

  const date = parse(raw, nativeFormat.value, new Date())
  setValue(isValid(date) ? formatDate(date, storageFormat.value) : raw)
}

// Calendar (reka-ui) works with @internationalized/date values.
const toCalendarDate = (date: Date): CalendarDate =>
  new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
const calendarValue = computed(() =>
  selectedDate.value ? toCalendarDate(selectedDate.value) : undefined,
)
const minValue = computed(() =>
  props.component.minDate ? toCalendarDate(parseStored(props.component.minDate)) : undefined,
)
const maxValue = computed(() =>
  props.component.maxDate ? toCalendarDate(parseStored(props.component.maxDate)) : undefined,
)
const disabledDates = computed(() =>
  (props.component.disabledDates ?? []).map((date) => toCalendarDate(parseStored(date)).toString()),
)
const isDateDisabled = (date: DateValue) => disabledDates.value.includes(date.toString())
// `defaultFocusedDate()`: the month the calendar opens on while the field is empty.
const focusedPlaceholder = computed(() => {
  if (!props.component.defaultFocusedDate) return undefined

  const date = parseStored(props.component.defaultFocusedDate)

  return isValid(date) ? toCalendarDate(date) : undefined
})
const step = computed(() => timeInputStep(props.component))

const onSelect = (next: DateValue | undefined) => {
  if (!next) {
    setValue(null)

    return
  }

  const base = selectedDate.value
  const withTime = new Date(
    next.year,
    next.month - 1,
    next.day,
    base?.getHours() ?? 0,
    base?.getMinutes() ?? 0,
    base?.getSeconds() ?? 0,
  )
  setValue(formatDate(withTime, storageFormat.value))

  if (props.component.closeOnDateSelection && !props.component.hasTime) {
    open.value = false
    blur()
  }
}

const timeValue = computed(() =>
  selectedDate.value
    ? formatDate(selectedDate.value, props.component.hasSeconds ? 'HH:mm:ss' : 'HH:mm')
    : '',
)

const onTimeInput = (raw: string) => {
  const base = selectedDate.value ?? wallClockNow(props.component.timezone)
  const [hours = '0', minutes = '0', seconds = '0'] = raw.split(':')
  const next = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    Number(hours),
    Number(minutes),
    Number(seconds),
  )
  setValue(formatDate(next, storageFormat.value))
}

// Kept out of the template: a `|` union there is parsed as a (removed) Vue 2 filter.
const weekStartsOn = computed(
  () => (props.component.firstDayOfWeek ?? 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
)
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <SelectAffixes :component="props.component" :error="error">
      <Input
        v-if="props.component.native || !props.component.hasDate"
        :id="id"
        :type="nativeType"
        :name="props.component.name"
        :model-value="nativeValue"
        :step="step"
        :min="props.component.minDate ? toNative(props.component.minDate) : undefined"
        :max="props.component.maxDate ? toNative(props.component.maxDate) : undefined"
        :disabled="disabled"
        :readonly="readOnly"
        :required="props.component.required"
        :lang="props.component.locale"
        :list="listId"
        :aria-invalid="aria['aria-invalid']"
        :aria-describedby="aria['aria-describedby']"
        :aria-required="aria['aria-required']"
        v-bind="props.component.extraInputAttributes"
        @update:model-value="onNativeInput"
        @blur="blur"
      />
      <Popover v-else :open="open" @update:open="open = $event && !readOnly">
        <PopoverTrigger as-child>
          <Button
            :id="id"
            type="button"
            data-input=""
            variant="outline"
            :disabled="disabled"
            @pointerenter="loadCalendar"
            @focus="loadCalendar"
            :aria-invalid="aria['aria-invalid']"
            :aria-describedby="aria['aria-describedby']"
            :class="
              cn(
                'w-full justify-start font-normal',
                !selectedDate && 'text-muted-foreground',
                error && 'border-destructive',
              )
            "
          >
            <CalendarIcon class="size-4" />
            {{
              selectedDate
                ? display(selectedDate)
                : (props.component.placeholder ?? t('form.pick_date', {}, 'Pick a date'))
            }}
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0" align="start">
          <Calendar
            :model-value="calendarValue"
            :locale="locale"
            :dir="direction"
            :today="toCalendarDate(wallClockNow(props.component.timezone))"
            :week-starts-on="weekStartsOn"
            :min-value="minValue"
            :max-value="maxValue"
            :default-placeholder="focusedPlaceholder"
            :is-date-disabled="isDateDisabled"
            initial-focus
            @update:model-value="onSelect($event as DateValue | undefined)"
          />
          <div v-if="props.component.hasTime" class="border-t p-3">
            <Input
              type="time"
              :step="step"
              :model-value="timeValue"
              @update:model-value="onTimeInput"
              @blur="blur"
            />
          </div>
        </PopoverContent>
      </Popover>
      <datalist
        v-if="(props.component.native || !props.component.hasDate) && props.component.datalist"
        :id="listId"
      >
        <option
          v-for="option in props.component.datalist"
          :key="option"
          :value="toNative(option) ?? option"
        />
      </datalist>
    </SelectAffixes>
  </FieldWrapper>
</template>
