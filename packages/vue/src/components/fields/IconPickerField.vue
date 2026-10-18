<script setup lang="ts">
import {
  fieldIds,
  iconPickerPreview,
  IconPickerSearch,
  isCustomSvgIcon,
  type IconPickerSchema,
} from '@alfakit/core'
import { ChevronsUpDownIcon, XIcon } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useChoice, useDirection, useFormatter, useT } from '../../context'
import { useStore } from '../../composables/use-store'
import Icon from '../../lib/Icon.vue'
import { cn } from '../../lib/utils'
import { useField, useFormStore } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Button from '../ui/Button.vue'
import Input from '../ui/Input.vue'
import Popover from '../ui/Popover.vue'
import PopoverContent from '../ui/PopoverContent.vue'
import PopoverTrigger from '../ui/PopoverTrigger.vue'
import Spinner from '../ui/Spinner.vue'
import Textarea from '../ui/Textarea.vue'
import { ICON_PICKER_SIZES } from './icon-picker-sizes'
import IconPickerValue from './IconPickerValue.vue'

/**
 * `IconPicker::make()`: a trigger showing the selected icon and a popover with a search
 * box, a set filter and a grid of icons loaded from the server a page at a time. The grid
 * is a listbox driven from the search box (`aria-activedescendant`): arrow keys move,
 * Enter picks, Escape closes.
 */
const props = defineProps<{ component: IconPickerSchema }>()
const t = useT()
const choice = useChoice()
const formatter = useFormatter()
const direction = useDirection()
const form = useFormStore()
const { value, setValue, blur, error, id, disabled, readOnly, aria } = useField<string | null>(
  () => props.component,
)
const search = new IconPickerSearch(form, props.component.statePath)
const state = useStore(search.store)
const open = ref(false)
const svg = ref('')
const grid = ref<HTMLElement | null>(null)
const listId = `${useId()}-icons`
const size = computed(() => ICON_PICKER_SIZES[props.component.previewSize] ?? ICON_PICKER_SIZES.md)
const columns = computed(() => Math.max(1, props.component.gridColumns))
const current = computed(() =>
  typeof value.value === 'string' && value.value !== '' ? value.value : null,
)
const locked = computed(() => disabled.value || readOnly.value)
const activeId = computed(() =>
  state.value.active >= 0 ? `${listId}-${state.value.active}` : undefined,
)
// Read after every pick: the previews map is filled by the search results.
const preview = computed(() =>
  iconPickerPreview(props.component.selected, current.value, search.preview(current.value)),
)

onBeforeUnmount(() => search.destroy())

// Keep the highlighted icon in view while the arrow keys move it.
watch(
  () => state.value.active,
  async (active) => {
    if (active < 0) return

    await nextTick()
    grid.value?.ownerDocument
      .getElementById(`${listId}-${active}`)
      ?.scrollIntoView?.({ block: 'nearest' })
  },
)

function onOpenChange(next: boolean) {
  open.value = next

  if (next) search.open()
}

function pick(next: string | null) {
  setValue(next)
  open.value = false
  blur()
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    const icon = state.value.icons[state.value.active]

    if (icon) {
      event.preventDefault()
      pick(icon.value)
    }

    return
  }

  // Home/End stay with the text cursor while there is a search to edit.
  if ((event.key === 'Home' || event.key === 'End') && state.value.search !== '') return

  if (search.move(event.key, columns.value, direction.value === 'rtl') !== null) {
    event.preventDefault()
  }
}

function onOpenAutoFocus(event: Event) {
  if (!props.component.searchable) {
    event.preventDefault()
    grid.value?.focus()
  }
}

function onScroll(event: Event) {
  const target = event.currentTarget as HTMLElement

  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 48) search.loadMore()
}

const status = computed(() => {
  const { loading, error: failed, icons, total } = state.value

  if (loading) return t('form.icon_picker.loading', {}, 'Loading icons…')
  if (failed) return t('form.icon_picker.error', {}, 'The icons could not be loaded.')
  if (icons.length === 0) return t('form.icon_picker.no_results', {}, 'No icons found.')

  return choice(
    'form.icon_picker.results',
    total,
    { count: formatter.value.number(total) },
    ':count icon|:count icons',
  )
})
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <div data-slot="icon-picker" class="flex items-center gap-2">
      <Popover :open="open" @update:open="onOpenChange">
        <PopoverTrigger as-child>
          <Button
            :id="id"
            type="button"
            variant="outline"
            data-slot="icon-picker-trigger"
            data-input=""
            aria-haspopup="dialog"
            :aria-expanded="open"
            v-bind="{ ...aria, ...props.component.extraInputAttributes }"
            :aria-labelledby="`${fieldIds(id).label} ${id}-value`"
            :aria-readonly="readOnly || undefined"
            :disabled="locked"
            :class="
              cn(
                'h-9 min-w-0 flex-1 justify-between px-3 font-normal hover:bg-transparent',
                error && 'border-destructive',
              )
            "
          >
            <IconPickerValue
              :id="`${id}-value`"
              :component="props.component"
              :value="current"
              :preview="preview"
            />
            <ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          data-slot="icon-picker-content"
          class="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 p-2"
          @open-auto-focus="onOpenAutoFocus"
        >
          <Input
            v-if="props.component.searchable"
            type="search"
            role="combobox"
            autocomplete="off"
            aria-autocomplete="list"
            aria-expanded="true"
            :aria-controls="listId"
            :aria-activedescendant="activeId"
            :aria-label="t('form.icon_picker.search_label', {}, 'Search icons')"
            :placeholder="t('form.icon_picker.search', {}, 'Search icons…')"
            :model-value="state.search"
            @update:model-value="search.setSearch($event)"
            @keydown="onKeyDown"
          />
          <select
            v-if="props.component.sets.length > 1"
            data-slot="icon-picker-set"
            :aria-label="t('form.icon_picker.set', {}, 'Icon set')"
            :value="state.set ?? ''"
            class="border-input dark:bg-input/30 h-8 w-full rounded-md border bg-transparent px-2 text-sm"
            @change="search.setSet(($event.target as HTMLSelectElement).value || null)"
          >
            <option value="">{{ t('form.icon_picker.all_sets', {}, 'All sets') }}</option>
            <option v-for="set in props.component.sets" :key="set.key" :value="set.key">
              {{ set.label }}
            </option>
          </select>
          <div
            :id="listId"
            ref="grid"
            role="listbox"
            data-slot="icon-picker-grid"
            :aria-label="props.component.label ?? t('form.icon_picker.icons', {}, 'Icons')"
            :aria-busy="state.loading || undefined"
            :tabindex="props.component.searchable ? -1 : 0"
            :aria-activedescendant="props.component.searchable ? undefined : activeId"
            class="grid max-h-72 gap-1 overflow-y-auto outline-none"
            :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
            @keydown="props.component.searchable ? undefined : onKeyDown($event)"
            @scroll="onScroll"
          >
            <div
              v-for="(icon, index) in state.icons"
              :id="`${listId}-${index}`"
              :key="icon.value"
              role="option"
              data-slot="icon-picker-option"
              :aria-selected="icon.value === current"
              :aria-label="icon.value"
              :title="icon.value"
              :data-active="index === state.active || undefined"
              :class="
                cn(
                  'hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center justify-center rounded-md',
                  size.cell,
                  index === state.active && 'bg-accent text-accent-foreground ring-ring ring-2',
                  icon.value === current && 'bg-primary/10 text-primary',
                )
              "
              @mousedown.prevent
              @click="pick(icon.value)"
            >
              <Icon :name="icon.icon ?? icon.value" :class="size.icon" />
            </div>
          </div>
          <div class="flex items-center justify-between gap-2">
            <p
              role="status"
              aria-live="polite"
              class="text-muted-foreground flex items-center gap-1 text-xs"
            >
              <Spinner v-if="state.loading" class="size-3" />
              {{ status }}
            </p>
            <Button
              v-if="state.hasMore"
              type="button"
              variant="ghost"
              size="sm"
              :disabled="state.loading"
              @click="search.loadMore()"
            >
              {{ t('form.icon_picker.load_more', {}, 'Load more icons') }}
            </Button>
          </div>
          <div
            v-if="props.component.allowCustomSvg"
            data-slot="icon-picker-custom"
            class="flex flex-col gap-2 border-t pt-2"
          >
            <Textarea
              v-model="svg"
              dir="ltr"
              rows="3"
              :aria-label="t('form.icon_picker.custom_svg_label', {}, 'Paste SVG markup')"
              placeholder='<svg viewBox="0 0 24 24">…</svg>'
              class="font-mono text-xs"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              :disabled="!isCustomSvgIcon(svg)"
              @click="
                () => {
                  pick(svg.trim())
                  svg = ''
                }
              "
            >
              {{ t('form.icon_picker.use_svg', {}, 'Use SVG') }}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        v-if="current !== null && !locked"
        type="button"
        variant="ghost"
        size="icon"
        data-slot="icon-picker-clear"
        :aria-label="t('form.icon_picker.clear', {}, 'Clear icon')"
        @click="pick(null)"
      >
        <XIcon />
      </Button>
    </div>
  </FieldWrapper>
</template>
