<script setup lang="ts">
import type { ColorPickerSchema } from '@alfakit/core'
import { colorAlpha, colorToHex, formatColor, withColorAlpha } from '@alfakit/core'
import { computed } from 'vue'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Input from '../ui/Input.vue'
import { useFormatter, useT } from '../../context'

const props = defineProps<{ component: ColorPickerSchema }>()
const { value, setValue, blur, error, id, disabled, readOnly, aria } = useField<string | null>(
  () => props.component,
)
const isHex = computed(() => props.component.format === 'hex')
const swatch = computed(() => colorToHex(value.value) ?? '#000000')
const t = useT()
const formatter = useFormatter()
// `rgba()`: the native swatch has no alpha, so a slider sets the opacity.
const alpha = computed(() => Math.round(colorAlpha(value.value) * 100))
const onAlpha = (event: Event) =>
  setValue(withColorAlpha(value.value, Number((event.target as HTMLInputElement).value) / 100))
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <div class="flex items-center gap-2">
      <label
        class="border-input relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs"
        :style="{ backgroundColor: value ?? 'transparent' }"
        :aria-label="t('form.pick_color', {}, 'Pick a colour')"
      >
        <input
          type="color"
          :value="swatch"
          :disabled="disabled || readOnly"
          class="absolute inset-0 size-full cursor-pointer opacity-0"
          @input="
            setValue(
              formatColor(($event.target as HTMLInputElement).value, props.component.format, value),
            )
          "
          @blur="blur"
        />
      </label>
      <Input
        :id="id"
        :name="props.component.name"
        :model-value="value ?? ''"
        :placeholder="props.component.placeholder ?? (isHex ? '#000000' : props.component.format)"
        :disabled="disabled"
        :readonly="readOnly"
        :aria-invalid="aria['aria-invalid']"
        :aria-describedby="aria['aria-describedby']"
        :aria-required="aria['aria-required']"
        class="font-mono"
        v-bind="props.component.extraInputAttributes"
        @update:model-value="setValue($event)"
        @blur="blur"
      />
    </div>
    <div
      v-if="props.component.format === 'rgba'"
      data-slot="color-picker-alpha"
      class="mt-2 flex items-center gap-2"
    >
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        :value="alpha"
        :disabled="disabled || readOnly"
        :aria-label="t('form.color_opacity', {}, 'Opacity')"
        :aria-valuetext="`${alpha}%`"
        class="accent-primary h-2 flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        @input="onAlpha"
        @blur="blur"
      />
      <span class="text-muted-foreground w-10 text-end text-xs tabular-nums">{{
        formatter.percent(alpha / 100)
      }}</span>
    </div>
  </FieldWrapper>
</template>
