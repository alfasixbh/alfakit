<script setup lang="ts">
import type { Option, SelectColumnSchema } from '@alfakit/core'
import {
  filterSelectColumnOptions,
  isOptionGroup,
  searchTableColumnOptions,
  selectColumnEmptyMessage,
} from '@alfakit/core'
import { CheckIcon, ChevronsUpDownIcon } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { usePanel, useT } from '../../context'
import { cn } from '../../lib/utils'
import Button from '../ui/Button.vue'
import Command from '../ui/Command.vue'
import CommandEmpty from '../ui/CommandEmpty.vue'
import CommandGroup from '../ui/CommandGroup.vue'
import CommandInput from '../ui/CommandInput.vue'
import CommandItem from '../ui/CommandItem.vue'
import CommandList from '../ui/CommandList.vue'
import Popover from '../ui/Popover.vue'
import PopoverContent from '../ui/PopoverContent.vue'
import PopoverTrigger from '../ui/PopoverTrigger.vue'
import Spinner from '../ui/Spinner.vue'
import { useCellUpdate, type CellProps } from './cell-update'

/**
 * `SelectColumn::native(false)`: a combobox, searchable with `searchableOptions()`. Options
 * come with the table, or from the server (`optionsSearchPath`) as the user types.
 */
const props = defineProps<CellProps>()
const t = useT()
const panel = usePanel()
const schema = computed(() => props.column as SelectColumnSchema)
const { update, saving, error } = useCellUpdate(props)
const value = ref(
  props.cell.state === null || props.cell.state === undefined ? '' : String(props.cell.state),
)
const label = ref<string | undefined>(props.cell.optionLabel)
const open = ref(false)
const search = ref('')
const loading = ref(false)
const remote = ref<Option[]>([])
const isRemote = computed(() => Boolean(schema.value.optionsSearchPath))
const staticOptions = computed(() =>
  schema.value.options.flatMap((option) => (isOptionGroup(option) ? option.options : [option])),
)
let request = 0

watch([open, search], ([isOpen, term], _old, onCleanup) => {
  const url = panel.value.endpoints.schemaOptions

  if (!isOpen || !isRemote.value || !url) return

  const timer = setTimeout(() => {
    const current = ++request
    loading.value = true

    void searchTableColumnOptions(url, props.token, props.component, schema.value, term)
      .then((results) => {
        if (current === request) remote.value = results
      })
      .catch(() => {
        if (current === request) remote.value = []
      })
      .finally(() => {
        if (current === request) loading.value = false
      })
  }, schema.value.optionsSearchDebounce ?? 300)

  onCleanup(() => clearTimeout(timer))
})

// Long labels wrap unless `wrapOptionLabels(false)` truncates them.
const optionLabelClass = computed(() =>
  schema.value.wrapOptionLabels === false
    ? 'min-w-0 truncate'
    : 'min-w-0 break-words whitespace-normal',
)

const options = computed(() =>
  filterSelectColumnOptions(
    isRemote.value ? remote.value : staticOptions.value,
    schema.value,
    isRemote.value ? '' : search.value,
    props.recordKey,
  ),
)
const emptyMessage = computed(() =>
  selectColumnEmptyMessage(schema.value, {
    loading: loading.value,
    search: search.value,
    optionCount: options.value.length,
  }),
)
const currentLabel = computed(
  () =>
    staticOptions.value.find((option) => option.value === value.value)?.label ??
    remote.value.find((option) => option.value === value.value)?.label ??
    label.value,
)
const showsClear = computed(() => schema.value.selectablePlaceholder && value.value !== '')

const onOpenChange = (next: boolean) => {
  open.value = next

  if (!next) search.value = ''
}

const choose = (next: string, nextLabel?: string) => {
  value.value = next
  label.value = nextLabel
  onOpenChange(false)
  void update(next === '' ? null : next)
}
</script>

<template>
  <span @click.stop>
    <Popover :open="open" @update:open="onOpenChange">
      <PopoverTrigger as-child>
        <Button
          type="button"
          variant="outline"
          size="sm"
          role="combobox"
          :aria-expanded="open"
          :aria-label="props.column.label || props.column.name"
          :aria-invalid="error ? true : undefined"
          :disabled="Boolean(props.cell.disabled) || saving"
          :class="cn('h-8 min-w-32 justify-between font-normal', error && 'border-destructive')"
        >
          <template v-if="value !== '' && currentLabel !== undefined">
            <!-- The server sanitises HTML labels (`Support\Html::sanitize`). -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-if="schema.allowOptionsHtml" class="min-w-0 truncate" v-html="currentLabel" />
            <span v-else class="min-w-0 truncate">{{ currentLabel }}</span>
          </template>
          <span v-else class="text-muted-foreground">{{
            schema.placeholder ??
            (value !== '' ? value : t('select_option', {}, 'Select an option'))
          }}</span>
          <Spinner v-if="loading" class="opacity-50" />
          <ChevronsUpDownIcon v-else class="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-64 p-0" align="start">
        <Command>
          <CommandInput
            v-if="schema.searchableOptions"
            :model-value="search"
            :placeholder="
              schema.searchPrompt ?? t('form.search_placeholder', {}, 'Type to search…')
            "
            @update:model-value="search = $event"
          />
          <CommandList>
            <CommandEmpty
              v-if="options.length === 0 && !showsClear"
              data-slot="select-column-message"
              >{{
                emptyMessage.message ?? t(emptyMessage.key, {}, emptyMessage.fallback)
              }}</CommandEmpty
            >
            <CommandGroup>
              <CommandItem v-if="showsClear" value="" @select="choose('')">
                <span class="text-muted-foreground">{{
                  schema.placeholder ?? t('clear', {}, 'Clear')
                }}</span>
              </CommandItem>
              <CommandItem
                v-for="option in options"
                :key="option.value"
                :value="option.value"
                :disabled="option.disabled"
                @select="choose(option.value, option.label)"
              >
                <CheckIcon
                  :class="cn('size-4', option.value === value ? 'opacity-100' : 'opacity-0')"
                />
                <!-- eslint-disable-next-line vue/no-v-html -->
                <span
                  v-if="schema.allowOptionsHtml"
                  :class="optionLabelClass"
                  v-html="option.label"
                />
                <span v-else :class="optionLabelClass">{{ option.label }}</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    <span v-if="error" class="text-destructive block text-xs">{{ error }}</span>
  </span>
</template>
