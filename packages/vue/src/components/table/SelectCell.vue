<script setup lang="ts">
import type { SelectColumnSchema } from '@alfakit/core'
import { isOptionGroup } from '@alfakit/core'
import { computed, ref, useId } from 'vue'
import { cn } from '../../lib/utils'
import { useCellUpdate, type CellProps } from './cell-update'

const props = defineProps<CellProps>()
const schema = computed(() => props.column as SelectColumnSchema)
const { update, saving, error } = useCellUpdate(props)
const errorId = useId()
const value = ref(
  props.cell.state === null || props.cell.state === undefined ? '' : String(props.cell.state),
)
// `optionsRelationship(ignoreRecord: true)`: the record itself is not an option.
const options = computed(() =>
  schema.value.options
    .flatMap((option) => (isOptionGroup(option) ? option.options : [option]))
    .filter((option) => !(schema.value.ignoreRecord && option.value === String(props.recordKey))),
)

const onChange = (event: Event) => {
  value.value = (event.target as HTMLSelectElement).value
  void update(value.value === '' ? null : value.value)
}
</script>

<template>
  <span @click.stop>
    <select
      :value="value"
      :disabled="Boolean(props.cell.disabled) || saving"
      :aria-label="props.column.label || props.column.name"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="error ? errorId : undefined"
      :class="
        cn(
          'border-input dark:bg-input/30 focus-visible:ring-ring/50 h-8 min-w-32 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]',
          error && 'border-destructive',
        )
      "
      @change="onChange"
    >
      <option v-if="schema.selectablePlaceholder" value="">{{ schema.placeholder ?? '' }}</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>
    <span v-if="error" :id="errorId" class="text-destructive block text-xs">{{ error }}</span>
  </span>
</template>
