<script setup lang="ts">
import type { ToggleSchema } from '@alfakit/core'
import { computed } from 'vue'
import {
  colorClass,
  switchOffColorClasses,
  switchOnColorClasses,
  textColorClasses,
} from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Switch from '../ui/Switch.vue'

const props = defineProps<{ component: ToggleSchema }>()
const { value, setValue, error, id, disabled, readOnly, aria } = useField<boolean | null>(
  () => props.component,
)
const on = computed(() => Boolean(value.value))
const icon = computed(() => (on.value ? props.component.onIcon : props.component.offIcon))
</script>

<template>
  <FieldWrapper
    :field="props.component"
    :html-for="id"
    :error="error"
    :inline="props.component.inline"
  >
    <div class="flex items-center gap-2">
      <Switch
        :id="id"
        :name="props.component.name"
        :model-value="on"
        :disabled="disabled || readOnly"
        :aria-readonly="readOnly || undefined"
        :aria-invalid="aria['aria-invalid']"
        :aria-describedby="aria['aria-describedby']"
        :aria-required="aria['aria-required']"
        :class="
          cn(
            props.component.onColor && colorClass(switchOnColorClasses, props.component.onColor),
            props.component.offColor && colorClass(switchOffColorClasses, props.component.offColor),
          )
        "
        @update:model-value="setValue($event)"
      />
      <Icon
        v-if="icon"
        :name="icon"
        :class="
          colorClass(
            textColorClasses,
            on ? props.component.onColor : props.component.offColor,
            'gray',
          )
        "
      />
    </div>
  </FieldWrapper>
</template>
