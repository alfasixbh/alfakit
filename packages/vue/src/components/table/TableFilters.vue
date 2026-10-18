<script setup lang="ts">
import type { TableSchema } from '@alfakit/core'
import {
  FilterFormSync,
  FormStore,
  filterFormComponents,
  filtersAreDeferred,
  filtersCollapsible,
  filtersFormWidthClass,
  filtersPlacement,
  triggerButtonView,
  visitTable,
} from '@alfakit/core'
import { ChevronDownIcon, FilterIcon } from '@lucide/vue'
import { createReusableTemplate } from '@vueuse/core'
import { computed, onScopeDispose, ref, watch } from 'vue'
import { useStore } from '../../composables/use-store'
import { usePageSchema, usePanel, useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { provideForm } from '../form/form-context'
import SchemaRenderer from '../schema/SchemaRenderer.vue'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'
import Dialog from '../ui/Dialog.vue'
import DialogContent from '../ui/DialogContent.vue'
import DialogDescription from '../ui/DialogDescription.vue'
import DialogFooter from '../ui/DialogFooter.vue'
import DialogHeader from '../ui/DialogHeader.vue'
import DialogTitle from '../ui/DialogTitle.vue'
import DialogTrigger from '../ui/DialogTrigger.vue'
import Popover from '../ui/Popover.vue'
import PopoverContent from '../ui/PopoverContent.vue'
import PopoverTrigger from '../ui/PopoverTrigger.vue'
import TableTriggerButton from './TableTriggerButton.vue'

/**
 * Filters are a small form whose state (keyed by filter name) is pushed into the query
 * string. The server re-renders the table with the filtered records.
 */
const props = defineProps<{ table: TableSchema; component: string }>()
const t = useT()
const panel = usePanel()
const page = usePageSchema()
const filters = computed(() => props.table.filters ?? [])
// `filtersFormSchema()` lays the filters out itself.
const components = computed(
  () => props.table.filtersFormSchema ?? filterFormComponents(filters.value),
)

const store = new FormStore(
  {
    components: components.value,
    state: props.table.filterState ?? {},
    columns: props.table.filtersFormColumns ?? { default: 1 },
  },
  {
    token: page.value?.token ?? '',
    component: `${props.component}.filters`,
    refreshUrl: undefined,
    optionsUrl: panel.value.endpoints.schemaOptions,
  },
)

provideForm(store)

// Server responses are merged in by FilterFormSync so typing that happens while a filter
// request is in flight is never reset.
const sync = new FilterFormSync(store)

watch([components, () => props.table.filterState], ([next, filterState]) => {
  sync.receive({
    components: next,
    state: filterState,
    columns: props.table.filtersFormColumns ?? { default: 1 },
  })
})

watch(
  () => page.value?.token,
  (token) => {
    if (token) store.setToken(token)
  },
)

const state = useStore(store.store)
const open = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null
const deferred = computed(() => filtersAreDeferred(props.table))
// Re-evaluated with the form state, which `hasUnsentChanges` reads.
const unsent = computed(() => {
  void state.value.values

  return deferred.value && sync.hasUnsentChanges
})

const apply = () => {
  sync.pushed(state.value.values)
  visitTable(
    props.table.identifier,
    { filters: state.value.values as Record<string, Record<string, unknown>> },
    ['page'],
  )
  open.value = false
}

const discard = () =>
  sync.discard({
    components: components.value,
    state: props.table.filterState,
    columns: props.table.filtersFormColumns ?? { default: 1 },
  })

const setModalOpen = (next: boolean) => {
  // Dismissing the dialog drops edits that were not applied.
  if (!next) discard()
  open.value = next
}

const reset = () => visitTable(props.table.identifier, { filters: null }, ['page'])

// Push changes to the server (debounced by the browser's natural typing pauses), unless
// the filters wait for the Apply button.
watch(
  () => [state.value.values, state.value.dirty] as const,
  ([values, dirty]) => {
    if (timer) clearTimeout(timer)

    if (!dirty.size || deferred.value) {
      return
    }

    timer = setTimeout(() => {
      sync.pushed(values)
      visitTable(
        props.table.identifier,
        { filters: values as Record<string, Record<string, unknown>> },
        ['page'],
      )
    }, 400)
  },
)

onScopeDispose(() => {
  if (timer) clearTimeout(timer)
  store.destroy()
})

const activeCount = computed(() => props.table.filterIndicators?.length ?? 0)
const placement = computed(() => filtersPlacement(props.table.filtersLayout))
const widthClass = computed(() => filtersFormWidthClass(props.table))
const sidebar = computed(() => placement.value === 'before' || placement.value === 'after')
const sidebarCollapsible = computed(() => filtersCollapsible(props.table.filtersLayout))
const collapsible = computed(() => props.table.filtersLayout === 'above-content-collapsible')
const inline = computed(() => placement.value === 'above' || placement.value === 'below')
// `filtersResetAction()` / `filtersApplyAction()` / `filtersTriggerAction()`.
const resetView = computed(() =>
  triggerButtonView(props.table, 'filtersReset', {
    label: t('table.reset_filters', {}, 'Reset'),
    variant: 'link',
  }),
)
const applyView = computed(() =>
  triggerButtonView(props.table, 'filtersApply', {
    label: t('table_filters.apply', {}, 'Apply'),
    variant: 'default',
  }),
)
const trigger = computed(() =>
  triggerButtonView(props.table, 'filters', {
    label: t('table.filters', {}, 'Filters'),
    badge: activeCount.value > 0 ? activeCount.value : undefined,
  }),
)
const showReset = computed(() => activeCount.value > 0 && Boolean(resetView.value))
const resetInHeader = computed(() => props.table.filtersResetActionPosition === 'header')
const [DefineReset, ResetButton] = createReusableTemplate()
const [DefineApply, ApplyButton] = createReusableTemplate()
const [DefineForm, FiltersForm] = createReusableTemplate()
</script>

<template>
  <template v-if="filters.length > 0">
    <DefineReset>
      <TableTriggerButton
        v-if="showReset && resetView"
        :view="resetView"
        data-slot="filters-reset"
        @click="reset"
      />
    </DefineReset>
    <DefineApply>
      <TableTriggerButton
        v-if="applyView"
        :view="applyView"
        data-slot="filters-apply"
        :disabled="!unsent"
        @click="apply"
      />
    </DefineApply>
    <DefineForm>
      <div class="flex flex-col gap-4">
        <div v-if="resetInHeader && showReset" class="flex justify-end"><ResetButton /></div>
        <SchemaRenderer :components="state.components" :columns="state.columns" class="gap-4" />
        <div
          v-if="(!resetInHeader && showReset) || (deferred && applyView)"
          class="flex items-center justify-end gap-2"
        >
          <ResetButton v-if="!resetInHeader" />
          <ApplyButton v-if="deferred" />
        </div>
      </div>
    </DefineForm>
    <aside
      v-if="sidebar"
      data-slot="table-filters-sidebar"
      :aria-label="t('table.filters', {}, 'Filters')"
      :class="cn('bg-muted/30 rounded-lg border lg:w-72 lg:shrink-0', widthClass)"
    >
      <button
        v-if="sidebarCollapsible"
        type="button"
        class="flex w-full items-center gap-2 p-4 text-sm font-medium"
        :aria-expanded="open"
        @click="open = !open"
      >
        <FilterIcon class="size-4" />
        {{ t('table.filters', {}, 'Filters') }}
        <Badge v-if="activeCount > 0" class="h-5 min-w-5 px-1">{{ activeCount }}</Badge>
        <ChevronDownIcon :class="cn('ms-auto size-4 transition-transform', open && 'rotate-180')" />
      </button>
      <div v-else class="flex items-center gap-2 px-4 pt-4 text-sm font-medium">
        <FilterIcon class="size-4" />
        {{ t('table.filters', {}, 'Filters') }}
      </div>
      <div v-if="!sidebarCollapsible || open" :class="cn('p-4', sidebarCollapsible && 'border-t')">
        <FiltersForm />
      </div>
    </aside>
    <div v-else-if="collapsible" class="bg-muted/30 rounded-lg border">
      <button
        type="button"
        class="flex w-full items-center gap-2 p-4 text-sm font-medium"
        :aria-expanded="open"
        @click="open = !open"
      >
        <FilterIcon class="size-4" />
        {{ t('table.filters', {}, 'Filters') }}
        <Badge v-if="activeCount > 0" class="h-5 min-w-5 px-1">{{ activeCount }}</Badge>
        <ChevronDownIcon :class="cn('ms-auto size-4 transition-transform', open && 'rotate-180')" />
      </button>
      <div v-if="open" class="border-t p-4"><FiltersForm /></div>
    </div>
    <div v-else-if="inline" class="bg-muted/30 rounded-lg border p-4"><FiltersForm /></div>
    <Dialog
      v-else-if="props.table.filtersLayout === 'modal'"
      :open="open"
      @update:open="setModalOpen"
    >
      <DialogTrigger v-if="trigger" as-child>
        <TableTriggerButton
          :view="trigger"
          :responsive-label="!props.table.triggerActions?.filters"
          :active="activeCount > 0"
        >
          <template #icon
            ><Icon name="alfakit::tables.actions.filter" :fallback="FilterIcon"
          /></template>
        </TableTriggerButton>
      </DialogTrigger>
      <DialogContent :class="widthClass ?? 'sm:max-w-2xl'">
        <DialogHeader>
          <DialogTitle>{{ t('table.filters', {}, 'Filters') }}</DialogTitle>
          <DialogDescription class="sr-only">{{ props.table.pluralModelLabel }}</DialogDescription>
        </DialogHeader>
        <div v-if="resetInHeader && showReset" class="flex justify-end"><ResetButton /></div>
        <div class="max-h-[60vh] overflow-y-auto">
          <SchemaRenderer :components="state.components" :columns="state.columns" class="gap-4" />
        </div>
        <DialogFooter class="items-center gap-2">
          <ResetButton v-if="!resetInHeader" />
          <span class="flex-1" />
          <Button type="button" variant="outline" size="sm" @click="setModalOpen(false)">{{
            t('table_filters.cancel', {}, 'Cancel')
          }}</Button>
          <ApplyButton />
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Popover v-else :open="open" @update:open="open = $event">
      <PopoverTrigger v-if="trigger" as-child>
        <TableTriggerButton
          :view="trigger"
          :responsive-label="!props.table.triggerActions?.filters"
          :active="activeCount > 0"
        >
          <template #icon
            ><Icon name="alfakit::tables.actions.filter" :fallback="FilterIcon"
          /></template>
        </TableTriggerButton>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        :class="cn(widthClass ? ['w-[calc(100vw-2rem)]', widthClass] : 'w-80 sm:w-96')"
      >
        <!-- `filtersFormMaxHeight()`: PopoverContent renders through a portal, so the
             height cap sits on its content. -->
        <div
          :class="cn(props.table.filtersFormMaxHeight && 'overflow-y-auto')"
          :style="
            props.table.filtersFormMaxHeight
              ? { maxHeight: props.table.filtersFormMaxHeight }
              : undefined
          "
        >
          <FiltersForm />
        </div>
      </PopoverContent>
    </Popover>
  </template>
</template>
