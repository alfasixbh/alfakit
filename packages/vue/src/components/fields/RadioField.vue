<script setup lang="ts">
import type { RadioSchema } from '@alfakit/core'
import { fieldIds, isOptionGroup } from '@alfakit/core'
import { computed } from 'vue'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Label from '../ui/Label.vue'
import RadioGroup from '../ui/RadioGroup.vue'
import RadioGroupItem from '../ui/RadioGroupItem.vue'

const props = defineProps<{ component: RadioSchema }>()
const { value, setValue, error, id, disabled, readOnly, aria } = useField<
  string | number | boolean | null
>(() => props.component)
const options = computed(() =>
  props.component.options.flatMap((option) => (isOptionGroup(option) ? option.options : [option])),
)
const current = computed(() =>
  value.value === null || value.value === undefined
    ? ''
    : typeof value.value === 'boolean'
      ? value.value
        ? '1'
        : '0'
      : String(value.value),
)
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <RadioGroup
      :model-value="current"
      :disabled="disabled || readOnly"
      :aria-readonly="readOnly || undefined"
      :class="cn(props.component.inline && 'flex flex-wrap gap-4')"
      :aria-labelledby="props.component.label ? fieldIds(id).label : undefined"
      :aria-invalid="aria['aria-invalid']"
      :aria-describedby="aria['aria-describedby']"
      :aria-required="aria['aria-required']"
      @update:model-value="setValue(String($event))"
    >
      <div v-for="option in options" :key="option.value" class="flex items-start gap-2">
        <RadioGroupItem
          :id="`${id}-${option.value}`"
          :value="option.value"
          :disabled="option.disabled"
          class="mt-0.5"
        />
        <div class="grid gap-0.5">
          <Label
            :for="`${id}-${option.value}`"
            :class="cn('font-normal', option.color && textColorClasses[option.color])"
            ><Icon v-if="option.icon" :name="option.icon" class="size-4" />{{ option.label }}</Label
          >
          <p v-if="option.description" class="text-muted-foreground text-xs">
            {{ option.description }}
          </p>
        </div>
      </div>
    </RadioGroup>
  </FieldWrapper>
</template>
