<script setup lang="ts">
import type { TextInputColumnSchema } from '@alfakit/core'
import { computed, ref } from 'vue'
import { colorClass, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Input from '../ui/Input.vue'
import { useCellUpdate, type CellProps } from './cell-update'

const props = defineProps<CellProps>()
const schema = computed(() => props.column as TextInputColumnSchema)
const { update, saving, error } = useCellUpdate(props)
const initial =
  props.cell.state === null || props.cell.state === undefined ? '' : String(props.cell.state)
const value = ref(initial)
// `prefix()` / `suffix()`: text affixes around the input, like the TextInput field.
const grouped = computed(() => Boolean(props.cell.prefix || props.cell.suffix))
</script>

<template>
  <span @click.stop>
    <span
      :data-slot="grouped ? 'input-group' : undefined"
      :class="
        grouped
          ? cn(
              'border-input dark:bg-input/30 has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-ring/50 flex h-8 min-w-32 items-stretch overflow-hidden rounded-md border shadow-xs has-[input:focus-visible]:ring-[3px]',
              error && 'border-destructive',
            )
          : 'contents'
      "
    >
      <span
        v-if="props.cell.prefix"
        data-slot="input-prefix"
        class="text-muted-foreground bg-muted/50 flex items-center border-e px-2 text-sm"
        >{{ props.cell.prefix }}</span
      >
      <span :class="cn('relative block', grouped && 'min-w-0 flex-1')">
        <span
          v-if="schema.prefixIcon"
          data-slot="input-prefix-icon"
          aria-hidden="true"
          :class="
            cn(
              'pointer-events-none absolute start-2.5 top-1/2 flex -translate-y-1/2',
              colorClass(textColorClasses, schema.prefixIconColor, 'gray'),
            )
          "
        >
          <Icon :name="schema.prefixIcon" class="size-4" />
        </span>
        <Input
          :type="schema.inputType"
          :model-value="value"
          :placeholder="schema.placeholder"
          :step="schema.step"
          :inputmode="schema.inputMode"
          :disabled="Boolean(props.cell.disabled) || saving"
          :aria-invalid="error ? true : undefined"
          :class="
            cn(
              'h-8 min-w-32',
              schema.prefixIcon && 'ps-8',
              schema.suffixIcon && 'pe-8',
              grouped &&
                'h-full rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent',
            )
          "
          @update:model-value="value = $event"
          @blur="value !== initial && void update(value)"
          @keydown.enter="($event.target as HTMLInputElement).blur()"
        />
        <span
          v-if="schema.suffixIcon"
          data-slot="input-suffix-icon"
          aria-hidden="true"
          :class="
            cn(
              'pointer-events-none absolute end-2.5 top-1/2 flex -translate-y-1/2',
              colorClass(textColorClasses, schema.suffixIconColor, 'gray'),
            )
          "
        >
          <Icon :name="schema.suffixIcon" class="size-4" />
        </span>
      </span>
      <span
        v-if="props.cell.suffix"
        data-slot="input-suffix"
        class="text-muted-foreground bg-muted/50 flex items-center border-s px-2 text-sm"
        >{{ props.cell.suffix }}</span
      >
    </span>
    <span v-if="error" class="text-destructive block text-xs">{{ error }}</span>
  </span>
</template>
