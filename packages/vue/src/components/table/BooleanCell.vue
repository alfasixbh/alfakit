<script setup lang="ts">
import type { ToggleColumnSchema } from '@alfakit/core'
import { computed, ref } from 'vue'
import {
  colorClass,
  switchOffColorClasses,
  switchOnColorClasses,
  textColorClasses,
} from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Checkbox from '../ui/Checkbox.vue'
import Switch from '../ui/Switch.vue'
import { useCellUpdate, type CellProps } from './cell-update'

const props = defineProps<CellProps>()
const { update, saving } = useCellUpdate(props)
const checked = ref(Boolean(props.cell.state))
const disabled = computed(() => Boolean(props.cell.disabled) || saving.value)
const toggle = computed(() => props.column as ToggleColumnSchema)

const onChange = (next: boolean) => {
  checked.value = next
  void update(next)
}
</script>

<template>
  <Checkbox
    v-if="props.column.type === 'CheckboxColumn'"
    :model-value="checked"
    :disabled="disabled"
    :aria-label="props.column.label || props.column.name"
    @update:model-value="onChange($event === true)"
    @click.stop
  />
  <span v-else class="inline-flex items-center gap-2" @click.stop>
    <Switch
      :model-value="checked"
      :disabled="disabled"
      :aria-label="props.column.label || props.column.name"
      :class="
        cn(
          toggle.onColor && colorClass(switchOnColorClasses, toggle.onColor),
          toggle.offColor && colorClass(switchOffColorClasses, toggle.offColor),
        )
      "
      @update:model-value="onChange"
    />
    <Icon
      v-if="checked ? toggle.onIcon : toggle.offIcon"
      :name="checked ? toggle.onIcon : toggle.offIcon"
      :class="colorClass(textColorClasses, checked ? toggle.onColor : toggle.offColor, 'gray')"
    />
  </span>
</template>
