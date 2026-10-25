<script setup lang="ts">
import type { CheckboxListSchema } from '@alfakit/core'
import { fieldIds, gridColumnsClasses, htmlLabelToText, isOptionGroup } from '@alfakit/core'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useT } from '../../context'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Button from '../ui/Button.vue'
import Checkbox from '../ui/Checkbox.vue'
import Input from '../ui/Input.vue'
import Label from '../ui/Label.vue'

const props = defineProps<{ component: CheckboxListSchema }>()
const t = useT()
const { value, setValue, error, id, disabled, readOnly, aria } = useField<Array<
  string | number
> | null>(() => props.component)
const search = ref('')
// `searchDebounce()`: the list is filtered by `query`, which trails the input.
const query = ref('')
let queryTimer: ReturnType<typeof setTimeout> | undefined

watch(search, (term) => {
  clearTimeout(queryTimer)

  if (!props.component.searchDebounce) {
    query.value = term

    return
  }

  queryTimer = setTimeout(() => (query.value = term), props.component.searchDebounce)
})
onBeforeUnmount(() => clearTimeout(queryTimer))

const selected = computed(() => (value.value ?? []).map(String))
const options = computed(() =>
  props.component.options.flatMap((option) => (isOptionGroup(option) ? option.options : [option])),
)
const visible = computed(() =>
  options.value.filter((option) =>
    (props.component.allowHtml ? htmlLabelToText(option.label) : option.label)
      .toLowerCase()
      .includes(query.value.toLowerCase()),
  ),
)

/**
 * `gridDirection('column')`: options flow down each column (CSS columns). Classes are
 * spelled out so Tailwind generates them.
 */
const COLUMN_FLOW_CLASSES: Record<number, string> = {
  2: 'md:columns-2',
  3: 'md:columns-3',
  4: 'md:columns-4',
  5: 'md:columns-5',
  6: 'md:columns-6',
}
const columnFlow = computed(
  () => props.component.gridDirection === 'column' && (props.component.gridColumns ?? 1) > 1,
)

const toggle = (key: string, checked: boolean) => {
  setValue(checked ? [...selected.value, key] : selected.value.filter((item) => item !== key))
}
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <div class="flex flex-col gap-2">
      <div
        v-if="props.component.searchable || (props.component.bulkToggleable && !readOnly)"
        class="flex min-w-0 flex-wrap items-center gap-2"
      >
        <Input
          v-if="props.component.searchable"
          v-model="search"
          :placeholder="props.component.searchPrompt ?? t('search', {}, 'Search')"
          :aria-label="props.component.searchPrompt ?? t('search', {}, 'Search')"
          class="h-8"
        />
        <div v-if="props.component.bulkToggleable && !readOnly" class="flex flex-wrap gap-1">
          <Button
            v-if="!props.component.selectAllAction?.hidden"
            type="button"
            variant="link"
            size="sm"
            data-slot="select-all"
            :disabled="disabled"
            @click="
              setValue(options.filter((option) => !option.disabled).map((option) => option.value))
            "
          >
            <Icon
              v-if="props.component.selectAllAction?.icon"
              :name="props.component.selectAllAction.icon"
            />
            {{ props.component.selectAllAction?.label ?? t('table.select_all', {}, 'Select all') }}
          </Button>
          <Button
            v-if="!props.component.deselectAllAction?.hidden"
            type="button"
            variant="link"
            size="sm"
            data-slot="deselect-all"
            :disabled="disabled"
            @click="setValue([])"
          >
            <Icon
              v-if="props.component.deselectAllAction?.icon"
              :name="props.component.deselectAllAction.icon"
            />
            {{
              props.component.deselectAllAction?.label ??
              t('table.deselect_all', {}, 'Deselect all')
            }}
          </Button>
        </div>
      </div>
      <div
        :data-grid-direction="props.component.gridDirection"
        :class="
          cn(
            props.component.inline
              ? 'flex flex-wrap gap-4'
              : columnFlow
                ? cn(
                    'gap-x-3 *:mb-3 *:break-inside-avoid',
                    COLUMN_FLOW_CLASSES[props.component.gridColumns ?? 1],
                  )
                : 'grid gap-3',
            !props.component.inline &&
              !columnFlow &&
              gridColumnsClasses(
                props.component.gridColumns
                  ? { default: 1, md: props.component.gridColumns }
                  : { default: 1 },
              ),
          )
        "
        role="group"
        :aria-labelledby="props.component.label ? fieldIds(id).label : undefined"
        :aria-describedby="aria['aria-describedby']"
      >
        <div v-for="option in visible" :key="option.value" class="flex items-start gap-2">
          <Checkbox
            :id="`${id}-${option.value}`"
            :model-value="selected.includes(option.value)"
            :disabled="disabled || readOnly || option.disabled"
            :aria-invalid="aria['aria-invalid']"
            class="mt-0.5"
            @update:model-value="toggle(option.value, $event === true)"
          />
          <div class="grid gap-0.5">
            <Label
              :for="`${id}-${option.value}`"
              :class="cn('font-normal', option.color && textColorClasses[option.color])"
              ><Icon v-if="option.icon" :name="option.icon" class="size-4" /><span
                v-if="props.component.allowHtml"
                v-html="option.label"
              /><template v-else>{{ option.label }}</template></Label
            >
            <p v-if="option.description" class="text-muted-foreground text-xs">
              {{ option.description }}
            </p>
          </div>
        </div>
      </div>
      <p
        v-if="props.component.searchable && query !== '' && visible.length === 0"
        data-slot="checkbox-list-empty"
        role="status"
        class="text-muted-foreground text-sm"
      >
        {{ props.component.noSearchResultsMessage ?? t('no_results', {}, 'No results.') }}
      </p>
    </div>
  </FieldWrapper>
</template>
