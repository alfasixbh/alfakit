<script setup lang="ts">
import type { MoneyInputSchema } from '@alfakit/core'
import { computed, ref } from 'vue'
import { useFormatter } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Input from '../ui/Input.vue'

/**
 * Amount input for any ISO 4217 currency. Shows the symbol where the user's locale puts
 * it, accepts the locale's separators and digits ("1.234,50", "١٢٫٥"), and rounds to
 * the currency's precision on blur. The form value is a plain decimal string ("1234.50").
 */
const props = defineProps<{ component: MoneyInputSchema }>()
const { value, setValue, blur, error, id, disabled, aria } = useField<string | number | null>(
  () => props.component,
)
const format = useFormatter()
const draft = ref<string | null>(null)

const affixes = computed(() => format.value.currencyAffixes(props.component.currency))
const prefixText = computed(() =>
  [props.component.prefix, affixes.value.prefix].filter(Boolean).join(' '),
)
const suffixText = computed(() =>
  [affixes.value.suffix, props.component.suffix].filter(Boolean).join(' '),
)

const amount = computed(() =>
  value.value === null || value.value === undefined || value.value === ''
    ? null
    : Number(value.value),
)
const display = computed(() =>
  amount.value === null || Number.isNaN(amount.value)
    ? String(value.value ?? '')
    : format.value.number(amount.value, {
        minimumFractionDigits: props.component.decimals,
        maximumFractionDigits: props.component.decimals,
      }),
)

const onFocus = () => {
  draft.value =
    amount.value === null || Number.isNaN(amount.value)
      ? String(value.value ?? '')
      : format.value.number(amount.value, {
          useGrouping: false,
          maximumFractionDigits: props.component.decimals,
        })
}

const onInput = (text: string) => {
  draft.value = text
  const parsed = format.value.parseNumber(text)
  setValue(text.trim() === '' ? null : parsed === null ? text : String(parsed))
}

const commit = (text: string) => {
  if (text.trim() === '') {
    setValue(null)

    return
  }

  const parsed = format.value.parseNumber(text)

  // Unparseable input is kept as typed so server validation can explain the problem;
  // amounts are brought inside `minValue()` / `maxValue()`.
  setValue(
    parsed === null
      ? text
      : Math.min(
          props.component.max ?? Number.POSITIVE_INFINITY,
          Math.max(props.component.min ?? Number.NEGATIVE_INFINITY, parsed),
        ).toFixed(props.component.decimals),
  )
}

const onBlur = (event: FocusEvent) => {
  commit((event.target as HTMLInputElement).value)
  draft.value = null
  blur()
}
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <div
      data-slot="input-group"
      :class="
        cn(
          'border-input dark:bg-input/30 has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-ring/50 flex h-9 w-full items-stretch overflow-hidden rounded-md border shadow-xs has-[input:focus-visible]:ring-[3px]',
          error && 'border-destructive',
          disabled && 'opacity-50',
        )
      "
    >
      <span
        v-if="prefixText || props.component.prefixIcon"
        class="text-muted-foreground bg-muted/50 flex items-center gap-1 border-e px-3 text-sm whitespace-nowrap"
      >
        <Icon :name="props.component.prefixIcon" />
        {{ prefixText }}
      </span>
      <Input
        :id="id"
        :name="props.component.name"
        type="text"
        :inputmode="props.component.decimals > 0 ? 'decimal' : 'numeric'"
        dir="ltr"
        :model-value="draft ?? display"
        :placeholder="props.component.placeholder"
        :disabled="disabled"
        :readonly="props.component.readOnly"
        :required="props.component.required"
        :autofocus="props.component.autofocus"
        :aria-invalid="aria['aria-invalid']"
        :aria-describedby="aria['aria-describedby']"
        :aria-required="aria['aria-required']"
        class="h-full border-0 bg-transparent text-end tabular-nums shadow-none focus-visible:ring-0 dark:bg-transparent"
        v-bind="props.component.extraInputAttributes"
        @focus="onFocus"
        @update:model-value="onInput"
        @blur="onBlur"
      />
      <span
        v-if="suffixText || props.component.suffixIcon"
        class="text-muted-foreground bg-muted/50 flex items-center gap-1 border-s px-3 text-sm whitespace-nowrap"
      >
        {{ suffixText }}
        <Icon :name="props.component.suffixIcon" />
      </span>
    </div>
  </FieldWrapper>
</template>
