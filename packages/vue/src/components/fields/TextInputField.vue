<script setup lang="ts">
import { applyMask, type TextInputSchema } from '@alfakit/core'
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Button from '../ui/Button.vue'
import Input from '../ui/Input.vue'
import { useT } from '../../context'

const LTR_INPUT_TYPES = new Set(['email', 'url', 'tel', 'password', 'number'])

const props = defineProps<{ component: TextInputSchema }>()
const { value, setValue, blur, error, id, disabled, aria } = useField<string | number | null>(
  () => props.component,
)
const revealed = ref(false)
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

onBeforeUnmount(() => clearTimeout(copiedTimer))

// `copyable()`: copy the current value; the confirmation stays for `copyMessageDuration`.
const copy = () => {
  const text = value.value === null || value.value === undefined ? '' : String(value.value)

  void navigator.clipboard?.writeText(text).then(() => {
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(
      () => (copied.value = false),
      props.component.copyMessageDuration ?? 1500,
    )
  })
}

const type = computed(() =>
  props.component.inputType === 'password' && revealed.value ? 'text' : props.component.inputType,
)
const hasAffixes = computed(() =>
  Boolean(
    props.component.prefix ||
    props.component.suffix ||
    props.component.prefixIcon ||
    props.component.suffixIcon ||
    props.component.revealable ||
    props.component.copyable,
  ),
)
// Addresses, numbers and passwords are always written left to right.
const dir = computed(() => (LTR_INPUT_TYPES.has(props.component.inputType) ? 'ltr' : 'auto'))
const listId = computed(() => (props.component.datalist ? `${id}-list` : undefined))
const t = useT()

// `mask()`: reformat what was typed before the value is emitted (the DOM is corrected too,
// since a rejected character leaves the model value unchanged).
const onMaskInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const masked = applyMask(input.value, props.component.mask)

  if (masked !== input.value) input.value = masked
}
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <div
      v-if="hasAffixes"
      data-slot="input-group"
      :class="
        cn(
          'border-input dark:bg-input/30 has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-ring/50 flex h-9 w-full items-stretch overflow-hidden rounded-md border shadow-xs has-[input:focus-visible]:ring-[3px]',
          error && 'border-destructive',
        )
      "
    >
      <span
        v-if="props.component.prefix || props.component.prefixIcon"
        class="text-muted-foreground bg-muted/50 flex items-center gap-1 border-e px-3 text-sm"
      >
        <Icon
          :name="props.component.prefixIcon"
          :class="
            props.component.prefixIconColor && textColorClasses[props.component.prefixIconColor]
          "
        />
        {{ props.component.prefix }}
      </span>
      <Input
        :id="id"
        :dir="dir"
        :name="props.component.name"
        :type="type"
        :model-value="value ?? ''"
        :placeholder="props.component.placeholder"
        :disabled="disabled"
        :readonly="props.component.readOnly"
        :required="props.component.required"
        :autofocus="props.component.autofocus"
        :minlength="props.component.minLength"
        :maxlength="props.component.maxLength"
        :min="props.component.min"
        :max="props.component.max"
        :step="props.component.step"
        :autocomplete="props.component.autocomplete"
        :inputmode="props.component.inputMode"
        :autocapitalize="props.component.autocapitalize"
        :list="listId"
        :aria-invalid="aria['aria-invalid']"
        :aria-describedby="aria['aria-describedby']"
        :aria-required="aria['aria-required']"
        class="h-full border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
        v-bind="props.component.extraInputAttributes"
        @input="onMaskInput"
        @update:model-value="setValue($event)"
        @blur="blur"
      />
      <span
        v-if="props.component.suffix || props.component.suffixIcon"
        class="text-muted-foreground bg-muted/50 flex items-center gap-1 border-s px-3 text-sm"
      >
        {{ props.component.suffix }}
        <Icon
          :name="props.component.suffixIcon"
          :class="
            props.component.suffixIconColor && textColorClasses[props.component.suffixIconColor]
          "
        />
      </span>
      <Button
        v-if="props.component.revealable"
        type="button"
        variant="ghost"
        size="icon-sm"
        class="my-auto me-1"
        :aria-label="
          revealed
            ? t('form.hide_password', {}, 'Hide password')
            : t('form.show_password', {}, 'Show password')
        "
        @click="revealed = !revealed"
      >
        <Icon
          v-if="revealed"
          name="alfakit::forms.components.text-input.actions.hide-password"
          :fallback="EyeOffIcon"
        />
        <Icon
          v-else
          name="alfakit::forms.components.text-input.actions.show-password"
          :fallback="EyeIcon"
        />
      </Button>
      <Button
        v-if="props.component.copyable"
        type="button"
        variant="ghost"
        size="icon-sm"
        class="my-auto me-1"
        data-slot="copy-button"
        :aria-label="t('copy', {}, 'Copy')"
        @click="copy"
      >
        <CheckIcon v-if="copied" />
        <Icon
          v-else
          name="alfakit::forms.components.text-input.actions.copy"
          :fallback="CopyIcon"
        />
      </Button>
    </div>
    <Input
      v-else
      :id="id"
      :dir="dir"
      :name="props.component.name"
      :type="type"
      :model-value="value ?? ''"
      :placeholder="props.component.placeholder"
      :disabled="disabled"
      :readonly="props.component.readOnly"
      :required="props.component.required"
      :autofocus="props.component.autofocus"
      :minlength="props.component.minLength"
      :maxlength="props.component.maxLength"
      :min="props.component.min"
      :max="props.component.max"
      :step="props.component.step"
      :autocomplete="props.component.autocomplete"
      :inputmode="props.component.inputMode"
      :autocapitalize="props.component.autocapitalize"
      :list="listId"
      :aria-invalid="aria['aria-invalid']"
      :aria-describedby="aria['aria-describedby']"
      :aria-required="aria['aria-required']"
      v-bind="props.component.extraInputAttributes"
      @input="onMaskInput"
      @update:model-value="setValue($event)"
      @blur="blur"
    />
    <span
      v-if="props.component.copyable && copied"
      role="status"
      :class="cn('text-xs', !props.component.copyMessage && 'sr-only')"
    >
      {{ props.component.copyMessage ?? t('copied', {}, 'Copied') }}
    </span>
    <datalist v-if="props.component.datalist" :id="listId">
      <option v-for="option in props.component.datalist" :key="option" :value="option" />
    </datalist>
  </FieldWrapper>
</template>
