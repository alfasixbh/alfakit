<script setup lang="ts">
import type { FieldAriaAttributes, Option, OptionOrGroup, SelectSchema } from '@alfakit/core'
import { debounce, htmlLabelToText, isOptionGroup } from '@alfakit/core'
import { CheckIcon, ChevronsUpDownIcon, XIcon } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import { useFormStore } from '../form/form-context'
import Badge from '../ui/Badge.vue'
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
import OptionLabel from './OptionLabel.vue'
import SelectReorderList from './SelectReorderList.vue'

function flatten(options: OptionOrGroup[]): Option[] {
  return options.flatMap((option) => (isOptionGroup(option) ? option.options : [option]))
}

const props = defineProps<{
  component: SelectSchema
  value: string | number | Array<string | number> | null | undefined
  setValue: (value: string | number | Array<string | number> | null) => void
  id: string
  disabled: boolean
  readOnly?: boolean
  error?: string
  aria?: FieldAriaAttributes
}>()

const t = useT()
const store = useFormStore()
const open = ref(false)
const search = ref('')
const loading = ref(false)
const remoteOptions = ref<Option[] | null>(null)
const labels = ref<Record<string, string>>({ ...(props.component.selectedLabels ?? {}) })
let requestId = 0

// Labels the server sends with a refresh win (e.g. after the edit option modal renamed
// the selected record).
watch(
  () => props.component.selectedLabels,
  (incoming) => {
    if (incoming && Object.keys(incoming).length > 0) {
      labels.value = { ...labels.value, ...incoming }
    }
  },
)

const selected = computed<string[]>(() =>
  Array.isArray(props.value)
    ? props.value.map(String)
    : props.value === null || props.value === undefined || props.value === ''
      ? []
      : [String(props.value)],
)
const staticOptions = computed(() => flatten(props.component.options))
const options = computed(() => remoteOptions.value ?? staticOptions.value)
const isRemote = computed(() => Boolean(props.component.searchable))

const runSearch = debounce((term: string) => {
  if (!isRemote.value) {
    return
  }

  const current = ++requestId
  loading.value = true

  void store
    .searchOptions(props.component.statePath, term)
    .then((results) => {
      if (current === requestId) {
        remoteOptions.value = results
      }
    })
    .finally(() => {
      if (current === requestId) {
        loading.value = false
      }
    })
}, props.component.searchDebounce ?? 300)

watch([open, search], ([isOpen, term]) => {
  if (isOpen && isRemote.value) {
    runSearch(term)
  }
})

// Resolve labels for values we have not seen yet (e.g. after a server refresh).
watch(
  selected,
  (keys) => {
    const missing = keys.filter(
      (key) => !labels.value[key] && !staticOptions.value.some((option) => option.value === key),
    )

    // Labels are fetched from the browser only, never during a server render.
    if (missing.length === 0 || !isRemote.value || typeof window === 'undefined') {
      return
    }

    void store.optionLabels(props.component.statePath, missing).then((resolved) => {
      labels.value = { ...labels.value, ...resolved }
    })
  },
  { immediate: true },
)

const labelFor = (key: string) =>
  labels.value[key] ??
  options.value.find((option) => option.value === key)?.label ??
  staticOptions.value.find((option) => option.value === key)?.label ??
  key

const canRemove = computed(
  () => !props.component.minItems || selected.value.length > props.component.minItems,
)

const toggle = (key: string, label: string) => {
  labels.value = { ...labels.value, [key]: label }

  if (props.component.multiple) {
    const next = selected.value.includes(key)
      ? selected.value.filter((item) => item !== key)
      : [...selected.value, key]

    if (props.component.maxItems && next.length > props.component.maxItems) {
      return
    }

    // `minItems()`: the last required selections cannot be removed.
    if (
      props.component.minItems &&
      next.length < selected.value.length &&
      next.length < props.component.minItems
    ) {
      return
    }

    props.setValue(next)
  } else {
    props.setValue(
      selected.value.includes(key) && props.component.selectablePlaceholder ? null : key,
    )
    open.value = false
  }
}

const filtered = computed(() =>
  isRemote.value
    ? options.value
    : options.value.filter((option) =>
        (props.component.allowHtml ? htmlLabelToText(option.label) : option.label)
          .toLowerCase()
          .includes(search.value.toLowerCase()),
      ),
)
// Nothing to choose from at all (not a search without matches).
const isEmpty = computed(() => search.value === '' && options.value.length === 0)

const onOpenChange = (next: boolean) => {
  open.value = next

  if (!next) {
    search.value = ''
    store.blur(props.component.statePath)
  }
}

// `reorderable()`: chosen options are listed under the trigger, where they can be dragged
// or moved with Alt + arrow keys (chips inside the trigger button can't hold controls).
const reorderable = computed(() => Boolean(props.component.multiple && props.component.reorderable))
const plainLabelFor = (key: string) =>
  props.component.allowHtml ? htmlLabelToText(labelFor(key)) : labelFor(key)

const removeTag = (event: Event, key: string) => {
  event.stopPropagation()
  props.setValue(selected.value.filter((item) => item !== key))
}
</script>

<template>
  <Popover :open="open" @update:open="onOpenChange">
    <PopoverTrigger as-child>
      <Button
        :id="props.id"
        type="button"
        variant="outline"
        data-input=""
        role="combobox"
        :aria-expanded="open"
        :aria-invalid="props.error ? true : undefined"
        :aria-describedby="props.aria?.['aria-describedby']"
        :aria-required="props.aria?.['aria-required']"
        :aria-readonly="props.readOnly || undefined"
        :disabled="props.disabled || props.readOnly"
        :class="
          cn(
            'h-auto min-h-9 w-full justify-between px-3 py-1.5 font-normal hover:bg-transparent',
            props.error && 'border-destructive',
          )
        "
      >
        <span class="flex flex-1 flex-wrap items-center gap-1 text-start">
          <span v-if="selected.length === 0" class="text-muted-foreground">{{
            props.component.placeholder ?? t('select_option', {}, 'Select an option')
          }}</span>
          <span v-if="reorderable && selected.length > 0" class="text-muted-foreground">{{
            props.component.placeholder ?? t('select_option', {}, 'Select an option')
          }}</span>
          <template v-if="props.component.multiple && !reorderable">
            <Badge v-for="key in selected" :key="key" variant="secondary" class="gap-1 pe-1">
              <span v-if="props.component.allowHtml" v-html="labelFor(key)" />
              <span v-else>{{ labelFor(key) }}</span>
              <span
                v-if="!props.disabled && !props.readOnly && canRemove"
                role="button"
                tabindex="-1"
                :aria-label="t('remove', {}, 'Remove')"
                class="hover:bg-foreground/10 rounded-sm"
                @click="removeTag($event, key)"
              >
                <XIcon class="size-3" />
              </span>
            </Badge>
          </template>
          <template v-else-if="!props.component.multiple && selected[0] !== undefined">
            <span
              v-if="props.component.allowHtml"
              class="truncate"
              v-html="labelFor(selected[0])"
            />
            <span v-else class="truncate">{{ labelFor(selected[0]) }}</span>
          </template>
        </span>
        <Spinner v-if="loading" class="opacity-50" />
        <ChevronsUpDownIcon v-else class="size-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-(--reka-popover-trigger-width) p-0" align="start">
      <Command>
        <CommandInput
          :model-value="search"
          :placeholder="
            props.component.searchPrompt ?? t('form.search_placeholder', {}, 'Type to search…')
          "
          @update:model-value="search = $event"
        />
        <CommandList>
          <div
            v-if="loading && filtered.length === 0"
            data-slot="select-loading"
            class="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm"
          >
            <Spinner />
            {{
              search !== ''
                ? (props.component.searchingMessage ?? t('form.searching', {}, 'Searching…'))
                : (props.component.loadingMessage ?? t('loading', {}, 'Loading…'))
            }}
          </div>
          <CommandEmpty v-else-if="filtered.length === 0">{{
            isEmpty
              ? (props.component.noOptionsMessage ??
                t('form.no_options', {}, 'No options available.'))
              : (props.component.noSearchResultsMessage ?? t('no_results', {}, 'No results.'))
          }}</CommandEmpty>
          <CommandGroup>
            <CommandItem
              v-for="option in filtered"
              :key="option.value"
              :value="option.value"
              :disabled="option.disabled"
              @select="toggle(option.value, option.label)"
            >
              <CheckIcon
                :class="cn('size-4', selected.includes(option.value) ? 'opacity-100' : 'opacity-0')"
              />
              <OptionLabel
                :option="option"
                :allow-html="props.component.allowHtml"
                :wrap="props.component.wrapOptionLabels !== false"
              />
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
  <SelectReorderList
    v-if="reorderable"
    :id="props.id"
    :values="Array.isArray(props.value) ? props.value : []"
    :label-for="plainLabelFor"
    :locked="props.disabled || Boolean(props.readOnly)"
    :can-remove="canRemove"
    :on-change="props.setValue"
  />
</template>
