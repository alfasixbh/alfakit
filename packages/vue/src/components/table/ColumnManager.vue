<script setup lang="ts">
import type { TableSchema } from '@alfakit/core'
import {
  columnDraftChanged,
  columnManagerPosition,
  columnOrderChanged,
  defaultVisibleColumns,
  FILTERS_MODAL_WIDTH_CLASSES,
  gridColumnsClasses,
  keepMoveButtonFocus,
  moveColumnInManager,
  moveColumnTo,
  orderColumnsBy,
  saveColumnOrder,
  slideOverSide,
  toggleVisibleColumn,
  triggerButtonView,
  visitTable,
} from '@alfakit/core'
import { ChevronDownIcon, ChevronUpIcon, Columns3Icon, GripVerticalIcon } from '@lucide/vue'
import { createReusableTemplate } from '@vueuse/core'
import { computed, ref, useId, watch } from 'vue'
import { useDirection, usePanel, useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { showToast } from '../notifications/flash-toasts'
import Button from '../ui/Button.vue'
import Checkbox from '../ui/Checkbox.vue'
import Dialog from '../ui/Dialog.vue'
import DialogContent from '../ui/DialogContent.vue'
import DialogDescription from '../ui/DialogDescription.vue'
import DialogHeader from '../ui/DialogHeader.vue'
import DialogTitle from '../ui/DialogTitle.vue'
import DialogTrigger from '../ui/DialogTrigger.vue'
import Popover from '../ui/Popover.vue'
import PopoverContent from '../ui/PopoverContent.vue'
import PopoverTrigger from '../ui/PopoverTrigger.vue'
import Sheet from '../ui/Sheet.vue'
import SheetContent from '../ui/SheetContent.vue'
import SheetDescription from '../ui/SheetDescription.vue'
import SheetHeader from '../ui/SheetHeader.vue'
import SheetTitle from '../ui/SheetTitle.vue'
import SheetTrigger from '../ui/SheetTrigger.vue'
import TableTriggerButton from './TableTriggerButton.vue'

/**
 * The column manager: show / hide toggleable columns (kept in the query string) and, with
 * `reorderableColumns()`, move columns (stored per user on the server) by dragging a row
 * onto another or with the move up / down buttons (the keyboard path).
 *
 * `deferColumnManager()` keeps toggles in a draft until "Apply"; `columnManagerLayout()`
 * opens it in a dialog; `columnManagerColumns()` lays the list out in a grid.
 */
const props = defineProps<{ table: TableSchema; token: string; component: string }>()
const t = useT()
const panel = usePanel()
const direction = useDirection()
const open = ref(false)
// `columnManagerTriggerAction()` may set `slideOver()`, `modalWidth()` and the heading.
const modal = computed(() => props.table.triggerActions?.columnManager?.modal)
const modalHeading = computed(() => modal.value?.heading ?? t('table.columns', {}, 'Columns'))
const modalDescription = computed(() => modal.value?.description ?? props.table.pluralModelLabel)
const modalWidthClass = computed(() =>
  modal.value?.width ? FILTERS_MODAL_WIDTH_CLASSES[modal.value.width] : undefined,
)
const saving = ref(false)
const dragging = ref<string | null>(null)
const dropTarget = ref<string | null>(null)
// Toggles of a deferred column manager wait here until "Apply".
const draft = ref<string[] | null>(null)
const reorderable = computed(() =>
  Boolean(props.table.reorderableColumns && panel.value.endpoints.tableColumns),
)
const toggleable = computed(() => Boolean(props.table.toggleableColumns))
const deferred = computed(() => Boolean(props.table.deferColumnManager))
// A moved column order: the draft of a deferred column manager, or shown at once while
// it is saved.
const orderDraft = ref<string[] | null>(null)
// Screen-reader announcement of the last move.
const announcement = ref('')
const idBase = useId()
const columns = computed(() =>
  orderColumnsBy(
    reorderable.value
      ? props.table.columns
      : props.table.columns.filter((column) => column.toggleable),
    orderDraft.value,
  ),
)
const appliedNames = computed(() => props.table.columns.map((column) => column.name))
const names = computed(() => orderDraft.value ?? appliedNames.value)
const orderChanged = computed(
  () => orderDraft.value !== null && columnOrderChanged(appliedNames.value, orderDraft.value),
)
const positions = computed(() =>
  Object.fromEntries(
    columns.value.map((column) => [
      column.name,
      columnManagerPosition(names.value, column.name, props.table.columnGroups),
    ]),
  ),
)

// The server's order replaces the one shown while saving.
watch(
  () => props.table.columns,
  () => {
    if (!deferred.value) orderDraft.value = null
  },
)
const visible = computed(() => draft.value ?? props.table.visibleColumns)

const trigger = computed(() =>
  triggerButtonView(props.table, 'columnManager', {
    label: t('table.columns', {}, 'Columns'),
    showLabel: false,
  }),
)
const resetView = computed(() =>
  triggerButtonView(props.table, 'columnManagerReset', {
    label: toggleable.value
      ? t('table.reset_columns', {}, 'Reset')
      : t('table.reset_column_order', {}, 'Reset column order'),
    variant: 'ghost',
  }),
)
const applyView = computed(() =>
  deferred.value
    ? triggerButtonView(props.table, 'columnManagerApply', {
        label: t('table_filters.apply', {}, 'Apply'),
        variant: 'default',
      })
    : null,
)
const inHeader = computed(() => props.table.columnManagerResetActionPosition === 'header')
const draftChanged = computed(
  () => draft.value !== null && columnDraftChanged(props.table.visibleColumns, draft.value),
)

const toggle = (name: string) => {
  const next = toggleVisibleColumn(visible.value, name)

  if (deferred.value) {
    draft.value = next
  } else {
    visitTable(props.table.identifier, { columns: next }, ['page'])
  }
}

const dragStart = (event: DragEvent, name: string) => {
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  dragging.value = name
}

const dragOver = (event: DragEvent, name: string) => {
  if (dragging.value === null) return

  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dropTarget.value = name
}

const drop = (name: string) => {
  if (dragging.value !== null && dragging.value !== name) {
    reorder(dragging.value, moveColumnTo(names.value, dragging.value, name))
  }

  dragging.value = null
  dropTarget.value = null
}

const save = async (order: string[], options: { reload?: boolean } = {}): Promise<boolean> => {
  const endpoint = panel.value.endpoints.tableColumns

  if (!endpoint) return false

  saving.value = true

  try {
    await saveColumnOrder(endpoint, props.token, props.component, order, options)

    return true
  } catch (error) {
    showToast({
      id: 'alfakit-column-order-failed',
      title: t('table.column_order_failed', {}, "Couldn't save the column order"),
      body: error instanceof Error ? error.message : String(error),
      status: 'danger',
      format: 'alfakit',
    })

    return false
  } finally {
    saving.value = false
  }
}

const positionText = (name: string) => {
  const { position, count, group } = positions.value[name] ?? { position: 0, count: 0 }

  return group
    ? t(
        'table.column_manager.position_in_group',
        { position, count, group },
        `Position ${position} of ${count} in ${group}.`,
      )
    : t('table.column_manager.position', { position, count }, `Position ${position} of ${count}.`)
}

const announce = (name: string, order: string[]) => {
  const { position, count, group } = columnManagerPosition(order, name, props.table.columnGroups)
  const label = props.table.columns.find((column) => column.name === name)?.label ?? name
  const replace = { column: label, position, count, group: group ?? '' }

  announcement.value = group
    ? deferred.value
      ? t(
          'table.column_manager.reordered_in_group_deferred',
          replace,
          `${label} moved to position ${position} of ${count} in ${group}. Apply columns to save your changes.`,
        )
      : t(
          'table.column_manager.reordered_in_group',
          replace,
          `${label} moved to position ${position} of ${count} in ${group}.`,
        )
    : deferred.value
      ? t(
          'table.column_manager.reordered_deferred',
          replace,
          `${label} moved to position ${position} of ${count}. Apply columns to save your changes.`,
        )
      : t(
          'table.column_manager.reordered',
          replace,
          `${label} moved to position ${position} of ${count}.`,
        )
}

// A new order: kept as a draft until "Apply" (`deferColumnManager()`), else saved now.
const reorder = (name: string, order: string[]) => {
  if (saving.value || !columnOrderChanged(names.value, order)) return

  orderDraft.value = order
  announcement.value = ''

  if (deferred.value) {
    announce(name, order)

    return
  }

  void save(order).then((saved) => {
    if (saved) announce(name, order)
    else orderDraft.value = null
  })
}

const move = (name: string, offset: -1 | 1, event: MouseEvent) => {
  keepMoveButtonFocus(event.currentTarget as HTMLElement | null)
  reorder(name, moveColumnInManager(names.value, name, offset, props.table.columnGroups))
}

// The order is saved before the visibility visit: both requests share the session, and a
// visit running alongside the save would write the old order back when it finishes.
const apply = async () => {
  const order = orderDraft.value && orderChanged.value ? orderDraft.value : null
  const columns =
    draft.value && columnDraftChanged(props.table.visibleColumns, draft.value) ? draft.value : null

  draft.value = null
  orderDraft.value = null
  announcement.value = ''
  open.value = false

  // The visibility visit renders the new order too: no second reload racing it.
  if (order) await save(order, { reload: !columns })

  if (columns) visitTable(props.table.identifier, { columns }, ['page'])
}

// Reset: the defined column order and, for toggleable columns, the default visibility.
const reset = async () => {
  if (reorderable.value) {
    orderDraft.value = null
    // The visibility visit below renders the defined order too.
    await save([], { reload: !toggleable.value })
  }

  if (toggleable.value) {
    draft.value = null
    visitTable(props.table.identifier, { columns: defaultVisibleColumns(props.table) }, ['page'])
  }
}

const setOpen = (next: boolean) => {
  // Closing without "Apply" drops the draft.
  if (!next) {
    draft.value = null
    if (deferred.value) orderDraft.value = null
    announcement.value = ''
  }
  open.value = next
}

const [DefineBody, ManagerBody] = createReusableTemplate()
const [DefineReset, ResetButton] = createReusableTemplate()
</script>

<template>
  <template v-if="(toggleable || reorderable) && trigger">
    <DefineReset>
      <TableTriggerButton
        v-if="resetView"
        :view="resetView"
        :disabled="saving"
        data-slot="column-manager-reset"
        :class="cn(!applyView && 'w-full')"
        @click="reset"
      />
    </DefineReset>
    <DefineBody>
      <div class="flex flex-col gap-1">
        <div v-if="inHeader && resetView" class="flex justify-end"><ResetButton /></div>
        <ul
          :class="
            cn(
              props.table.columnManagerColumns
                ? ['grid gap-0.5', gridColumnsClasses(props.table.columnManagerColumns)]
                : 'flex flex-col gap-0.5',
            )
          "
          :aria-label="t('table.columns', {}, 'Columns')"
        >
          <li
            v-for="column in columns"
            :key="column.name"
            :data-column="column.name"
            :draggable="reorderable && !saving"
            :class="
              cn(
                'flex items-center gap-2 rounded-md px-2 py-1 text-sm',
                reorderable && 'cursor-grab',
                dragging === column.name && 'opacity-50',
                dropTarget === column.name && dragging !== column.name && 'bg-muted',
              )
            "
            @dragstart="dragStart($event, column.name)"
            @dragover="dragOver($event, column.name)"
            @dragleave="dropTarget === column.name && (dropTarget = null)"
            @dragend="((dragging = null), (dropTarget = null))"
            @drop.prevent="drop(column.name)"
          >
            <GripVerticalIcon
              v-if="reorderable"
              class="text-muted-foreground size-4 shrink-0"
              aria-hidden="true"
            />
            <label v-if="column.toggleable" class="flex min-w-0 flex-1 items-center gap-2">
              <Checkbox
                :model-value="visible.includes(column.name)"
                @update:model-value="toggle(column.name)"
              />
              <span class="truncate">{{ column.label }}</span>
            </label>
            <span v-else class="min-w-0 flex-1 truncate">{{ column.label }}</span>
            <span v-if="reorderable" class="flex shrink-0 items-center">
              <span
                :id="`${idBase}-${column.name}-position`"
                class="sr-only"
                data-slot="column-manager-position"
                >{{ positionText(column.name) }}</span
              >
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                :disabled="(positions[column.name]?.position ?? 0) <= 1"
                :aria-disabled="saving || undefined"
                :aria-describedby="`${idBase}-${column.name}-position`"
                :aria-label="
                  t('table.move_column_up', { column: column.label }, `Move ${column.label} up`)
                "
                @click="move(column.name, -1, $event)"
                ><ChevronUpIcon
              /></Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                :disabled="
                  (positions[column.name]?.position ?? 0) >= (positions[column.name]?.count ?? 0)
                "
                :aria-disabled="saving || undefined"
                :aria-describedby="`${idBase}-${column.name}-position`"
                :aria-label="
                  t('table.move_column_down', { column: column.label }, `Move ${column.label} down`)
                "
                @click="move(column.name, 1, $event)"
                ><ChevronDownIcon
              /></Button>
            </span>
          </li>
        </ul>
        <div
          v-if="reorderable"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          class="sr-only"
          data-slot="column-manager-announcement"
        >
          {{ announcement }}
        </div>
        <div
          v-if="(!inHeader && resetView) || applyView"
          class="mt-1 flex items-center justify-end gap-2"
        >
          <ResetButton v-if="!inHeader" />
          <TableTriggerButton
            v-if="applyView"
            :view="applyView"
            data-slot="column-manager-apply"
            :disabled="!draftChanged && !orderChanged"
            @click="apply"
          />
        </div>
      </div>
    </DefineBody>
    <Sheet
      v-if="props.table.columnManagerLayout === 'modal' && modal?.slideOver"
      :open="open"
      @update:open="setOpen"
    >
      <SheetTrigger as-child>
        <TableTriggerButton :view="trigger">
          <template #icon
            ><Icon name="alfakit::tables.actions.column-manager" :fallback="Columns3Icon"
          /></template>
        </TableTriggerButton>
      </SheetTrigger>
      <SheetContent
        :side="slideOverSide(modal.slideOverPosition, direction)"
        :class="cn('flex w-full flex-col gap-0 p-0', modalWidthClass ?? 'sm:max-w-md')"
        data-slot="column-manager"
        data-slide-over=""
      >
        <SheetHeader class="border-b">
          <SheetTitle>{{ modalHeading }}</SheetTitle>
          <SheetDescription :class="modal.description ? undefined : 'sr-only'">{{
            modalDescription
          }}</SheetDescription>
        </SheetHeader>
        <div class="flex-1 overflow-y-auto p-4"><ManagerBody /></div>
      </SheetContent>
    </Sheet>
    <Dialog
      v-else-if="props.table.columnManagerLayout === 'modal'"
      :open="open"
      @update:open="setOpen"
    >
      <DialogTrigger as-child>
        <TableTriggerButton :view="trigger">
          <template #icon
            ><Icon name="alfakit::tables.actions.column-manager" :fallback="Columns3Icon"
          /></template>
        </TableTriggerButton>
      </DialogTrigger>
      <DialogContent :class="modalWidthClass ?? 'sm:max-w-lg'" data-slot="column-manager">
        <DialogHeader>
          <DialogTitle>{{ modalHeading }}</DialogTitle>
          <DialogDescription :class="modal?.description ? undefined : 'sr-only'">{{
            modalDescription
          }}</DialogDescription>
        </DialogHeader>
        <div class="max-h-[60vh] overflow-y-auto"><ManagerBody /></div>
      </DialogContent>
    </Dialog>
    <Popover v-else :open="open" @update:open="setOpen">
      <PopoverTrigger as-child>
        <TableTriggerButton :view="trigger">
          <template #icon
            ><Icon name="alfakit::tables.actions.column-manager" :fallback="Columns3Icon"
          /></template>
        </TableTriggerButton>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        :class="cn('p-2', props.table.columnManagerColumns ? 'w-auto min-w-64' : 'w-64')"
        data-slot="column-manager"
      >
        <ManagerBody />
      </PopoverContent>
    </Popover>
  </template>
</template>
