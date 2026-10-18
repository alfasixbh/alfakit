<script setup lang="ts">
import type {
  QueryBuilderConstraintRule,
  QueryBuilderConstraintSchema,
  QueryBuilderGroup,
  RulePath,
} from '@alfakit/core'
import {
  constraintPickerSections,
  filterQueryBuilderOptions,
  findConstraint,
  findOperator,
  queryBuilderInputType,
  queryBuilderOptions,
  removeRule,
  updateRule,
} from '@alfakit/core'
import { XIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useT } from '../../context'
import Button from '../ui/Button.vue'
import Input from '../ui/Input.vue'

const props = defineProps<{
  rule: QueryBuilderConstraintRule
  path: RulePath
  tree: QueryBuilderGroup
  constraints: QueryBuilderConstraintSchema[]
  locked: boolean
}>()
const emit = defineEmits<{ change: [tree: QueryBuilderGroup] }>()
const t = useT()

const SELECT_CLASS =
  'border-input dark:bg-input/30 focus-visible:ring-ring/50 h-8 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50'

const constraint = computed(() => findConstraint(props.constraints, props.rule.constraint))
const operator = computed(() => findOperator(constraint.value, props.rule.operator))
const input = computed(() => operator.value?.input ?? 'none')
// A custom operator's own options take one value.
const multiple = computed(() => Boolean(constraint.value?.multiple && !operator.value?.options))
const search = ref('')
const allOptions = computed(() =>
  constraint.value ? queryBuilderOptions(constraint.value, operator.value) : [],
)
// `searchable()`: the search narrows the options; selected ones stay listed.
const options = computed(() => {
  const filtered = constraint.value?.searchable
    ? filterQueryBuilderOptions(allOptions.value, search.value)
    : allOptions.value
  const kept = allOptions.value.filter(
    (option) =>
      selected.value.includes(String(option.value)) &&
      !filtered.some((item) => item.value === option.value),
  )

  return [...kept, ...filtered]
})
const selected = computed(() =>
  Array.isArray(props.rule.value)
    ? props.rule.value.map(String)
    : props.rule.value
      ? [String(props.rule.value)]
      : [],
)
const scalar = computed(() =>
  props.rule.value === undefined || props.rule.value === null
    ? ''
    : String(Array.isArray(props.rule.value) ? props.rule.value[0] : props.rule.value),
)

const update = (changes: Partial<Omit<QueryBuilderConstraintRule, 'type'>>) =>
  emit('change', updateRule(props.tree, props.path, changes, props.constraints))

const toggleOption = (value: string, checked: boolean) =>
  update({
    value: checked ? [...selected.value, value] : selected.value.filter((item) => item !== value),
  })

const target = (event: Event) => event.target as HTMLInputElement | HTMLSelectElement
</script>

<template>
  <div data-slot="query-builder-rule" class="flex flex-wrap items-center gap-2">
    <select
      :class="SELECT_CLASS"
      :value="props.rule.constraint"
      :disabled="props.locked"
      :aria-label="t('query_builder.constraint', {}, 'Field')"
      @change="update({ constraint: target($event).value })"
    >
      <option v-if="!constraint" :value="props.rule.constraint">{{ props.rule.constraint }}</option>
      <template
        v-for="section in constraintPickerSections(props.constraints)"
        :key="section.label ?? ''"
      >
        <optgroup v-if="section.label" :label="section.label">
          <option v-for="item in section.constraints" :key="item.name" :value="item.name">
            {{ item.label }}
          </option>
        </optgroup>
        <template v-else>
          <option v-for="item in section.constraints" :key="item.name" :value="item.name">
            {{ item.label }}
          </option>
        </template>
      </template>
    </select>
    <select
      v-if="constraint"
      :class="SELECT_CLASS"
      :value="props.rule.operator"
      :disabled="props.locked"
      :aria-label="t('query_builder.operator', {}, 'Operator')"
      @change="update({ operator: target($event).value })"
    >
      <option v-for="item in constraint.operators" :key="item.name" :value="item.name">
        {{ item.label }}
      </option>
    </select>
    <template v-if="constraint && operator && input !== 'none'">
      <Input
        v-if="input === 'select' && constraint.searchable"
        type="search"
        data-slot="query-builder-search"
        class="h-8 w-40"
        :model-value="search"
        :disabled="props.locked"
        :placeholder="t('form.search_placeholder', {}, 'Type to search…')"
        :aria-label="t('query_builder.search_options', {}, 'Search options')"
        @update:model-value="search = String($event)"
      />
      <div
        v-if="input === 'select' && multiple"
        role="group"
        :aria-label="t('query_builder.value', {}, 'Value')"
        class="flex flex-wrap items-center gap-x-3 gap-y-1"
      >
        <label
          v-for="option in options"
          :key="option.value"
          class="flex items-center gap-1.5 text-sm"
        >
          <input
            type="checkbox"
            class="accent-primary size-4"
            :disabled="props.locked"
            :checked="selected.includes(String(option.value))"
            @change="
              toggleOption(String(option.value), ($event.target as HTMLInputElement).checked)
            "
          />
          {{ option.label }}
        </label>
      </div>
      <select
        v-else-if="input === 'select'"
        :class="SELECT_CLASS"
        :value="scalar"
        :disabled="props.locked"
        :aria-label="t('query_builder.value', {}, 'Value')"
        @change="update({ value: target($event).value === '' ? null : target($event).value })"
      >
        <option value="">{{ t('query_builder.select_placeholder', {}, 'Select…') }}</option>
        <option v-for="option in options" :key="option.value" :value="String(option.value)">
          {{ option.label }}
        </option>
      </select>
      <Input
        v-else
        :type="queryBuilderInputType(input)"
        :step="input === 'number' ? (constraint.step ?? 'any') : input === 'year' ? 1 : undefined"
        :min="input === 'year' ? 1 : undefined"
        :max="input === 'year' ? 9999 : undefined"
        class="h-8 w-auto min-w-32 flex-1"
        :model-value="scalar"
        :disabled="props.locked"
        :aria-label="t('query_builder.value', {}, 'Value')"
        @update:model-value="update({ value: $event })"
      />
    </template>
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      class="ms-auto"
      :disabled="props.locked"
      :aria-label="t('query_builder.remove_rule', {}, 'Remove rule')"
      @click="emit('change', removeRule(props.tree, props.path))"
    >
      <XIcon />
    </Button>
  </div>
</template>
