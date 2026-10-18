<script setup lang="ts">
import { fieldIds, iconPickerPreview, type IconPickerSchema } from '@alfakit/core'
import { ChevronsUpDownIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import IconPickerValue from './IconPickerValue.vue'

/** What the server renders and hydration shows: the selected icon, not yet interactive. */
const props = defineProps<{ component: IconPickerSchema }>()
const { value, error, id, aria } = useField<string | null>(() => props.component)
const current = computed(() =>
  typeof value.value === 'string' && value.value !== '' ? value.value : null,
)
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <div data-slot="icon-picker" class="flex items-center gap-2">
      <button
        :id="id"
        type="button"
        disabled
        aria-busy="true"
        data-slot="icon-picker-trigger"
        data-input=""
        v-bind="aria"
        :aria-labelledby="`${fieldIds(id).label} ${id}-value`"
        class="border-input dark:bg-input/30 flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-transparent px-3 text-start text-sm shadow-xs"
      >
        <IconPickerValue
          :id="`${id}-value`"
          :component="props.component"
          :value="current"
          :preview="iconPickerPreview(props.component.selected, current)"
        />
        <ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
      </button>
    </div>
  </FieldWrapper>
</template>
