<script setup lang="ts">
import type { SelectSchema } from '@alfakit/core'
import { htmlLabelToText, isOptionGroup } from '@alfakit/core'
import { computed } from 'vue'
import { useT } from '../../context'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Select from '../ui/Select.vue'
import SelectContent from '../ui/SelectContent.vue'
import SelectGroup from '../ui/SelectGroup.vue'
import SelectItem from '../ui/SelectItem.vue'
import SelectLabel from '../ui/SelectLabel.vue'
import SelectTrigger from '../ui/SelectTrigger.vue'
import SelectValue from '../ui/SelectValue.vue'
import ComboboxSelect from './ComboboxSelect.vue'
import OptionLabel from './OptionLabel.vue'
import SelectAffixes from './SelectAffixes.vue'

const props = defineProps<{ component: SelectSchema }>()
const { value, setValue, blur, error, id, disabled, readOnly, aria } = useField<
  string | number | Array<string | number> | null
>(() => props.component)

const isNative = computed(
  () => props.component.native && !props.component.multiple && !props.component.searchable,
)
const isSimple = computed(() => !props.component.multiple && !props.component.searchable)
const current = computed(() =>
  value.value === null || value.value === undefined ? '' : String(value.value),
)
const hasValue = computed(
  () => value.value !== null && value.value !== undefined && value.value !== '',
)
const t = useT()
/** Text of an option label for native `<option>`s (`allowHtml()` labels are HTML). */
const plainLabel = (label: string): string =>
  props.component.allowHtml ? htmlLabelToText(label) : label
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <SelectAffixes :component="props.component" :error="error">
      <select
        v-if="isNative"
        :id="id"
        :name="props.component.name"
        :value="current"
        :disabled="disabled || readOnly"
        :required="props.component.required"
        :aria-invalid="aria['aria-invalid']"
        :aria-describedby="aria['aria-describedby']"
        :aria-required="aria['aria-required']"
        :aria-readonly="readOnly || undefined"
        class="border-input dark:bg-input/30 focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        @change="
          setValue(
            ($event.target as HTMLSelectElement).value === ''
              ? null
              : ($event.target as HTMLSelectElement).value,
          )
        "
        @blur="blur"
      >
        <option v-if="props.component.selectablePlaceholder" value="">
          {{ props.component.placeholder ?? t('select_option', {}, 'Select an option') }}
        </option>
        <template
          v-for="option in props.component.options"
          :key="isOptionGroup(option) ? option.label : option.value"
        >
          <optgroup v-if="isOptionGroup(option)" :label="option.label">
            <option
              v-for="item in option.options"
              :key="item.value"
              :value="item.value"
              :disabled="item.disabled"
            >
              {{ plainLabel(item.label) }}
            </option>
          </optgroup>
          <option v-else :value="option.value" :disabled="option.disabled">
            {{ plainLabel(option.label) }}
          </option>
        </template>
      </select>
      <Select
        v-else-if="isSimple"
        :model-value="current"
        :disabled="disabled || readOnly"
        @update:model-value="setValue($event === '__none__' ? null : ($event as string))"
      >
        <SelectTrigger
          :id="id"
          :aria-invalid="aria['aria-invalid']"
          :aria-describedby="aria['aria-describedby']"
          :aria-required="aria['aria-required']"
          :aria-readonly="readOnly || undefined"
          class="w-full"
        >
          <SelectValue
            :placeholder="props.component.placeholder ?? t('select_option', {}, 'Select an option')"
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-if="props.component.selectablePlaceholder && hasValue"
            value="__none__"
            class="text-muted-foreground"
            >{{ props.component.placeholder ?? '—' }}</SelectItem
          >
          <template
            v-for="option in props.component.options"
            :key="isOptionGroup(option) ? option.label : option.value"
          >
            <SelectGroup v-if="isOptionGroup(option)">
              <SelectLabel>{{ option.label }}</SelectLabel>
              <SelectItem
                v-for="item in option.options"
                :key="item.value"
                :value="item.value"
                :disabled="item.disabled"
              >
                <OptionLabel
                  :option="item"
                  :allow-html="props.component.allowHtml"
                  :wrap="props.component.wrapOptionLabels !== false"
                />
              </SelectItem>
            </SelectGroup>
            <SelectItem v-else :value="option.value" :disabled="option.disabled">
              <OptionLabel
                :option="option"
                :allow-html="props.component.allowHtml"
                :wrap="props.component.wrapOptionLabels !== false"
              />
            </SelectItem>
          </template>
          <div
            v-if="props.component.options.length === 0"
            data-slot="select-empty"
            class="text-muted-foreground px-2 py-1.5 text-sm"
          >
            {{
              props.component.noOptionsMessage ?? t('form.no_options', {}, 'No options available.')
            }}
          </div>
        </SelectContent>
      </Select>
      <ComboboxSelect
        v-else
        :id="id"
        :component="props.component"
        :value="value"
        :set-value="setValue"
        :disabled="disabled"
        :read-only="readOnly"
        :error="error"
        :aria="aria"
      />
    </SelectAffixes>
  </FieldWrapper>
</template>
