<script setup lang="ts">
import type {
  ActionContext,
  ActionSchema,
  AnyActionSchema,
  RecordKey,
  TableRecordSchema,
  TableSchema,
} from '@alfakit/core'
import {
  STACKED_TABLE_CLASSES,
  TableSelection,
  VIRTUAL_ESTIMATES,
  canSelectAllRecords,
  columnGroupHeaderRow,
  columnVisibilityClasses,
  debounce,
  filtersPlacement,
  groupTableRows,
  isGroupedColumn,
  isTableLoading,
  mobileTable,
  moveListItem,
  pageSelectionState,
  paginationTotal,
  primaryColumnName,
  reorderTable,
  startTableReordering,
  stopTableReordering,
  resolvePartialProps,
  selectedRecordsArguments,
  skeletonRowCount,
  stackedCellClasses,
  tableLoadingStore,
  triggerButtonView,
  virtualizeOptions,
  visitTable,
  pageFlash,
  cachedTableTotals,
  loadTableTotals,
  tableTotalsFailed,
  tableTotalsStore,
  withTableTotals,
} from '@alfakit/core'
import { Link, router } from '@inertiajs/vue3'
import { createReusableTemplate } from '@vueuse/core'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  GripVerticalIcon,
  SearchIcon,
  Table2Icon,
  XIcon,
} from '@lucide/vue'
import { computed, onScopeDispose, ref, watch, type HTMLAttributes } from 'vue'
import { useIsMobile } from '../../composables/use-mobile'
import { useStore } from '../../composables/use-store'
import { useVirtualList } from '../../composables/use-virtual-list'
import {
  useActionRunner,
  useChoice,
  usePageSchema,
  usePanel,
  usePollComponent,
  useT,
} from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import ActionList from '../actions/ActionList.vue'
import Button from '../ui/Button.vue'
import Checkbox from '../ui/Checkbox.vue'
import Input from '../ui/Input.vue'
import Table from '../ui/Table.vue'
import TableBody from '../ui/TableBody.vue'
import TableCell from '../ui/TableCell.vue'
import TableHead from '../ui/TableHead.vue'
import TableHeader from '../ui/TableHeader.vue'
import TableRow from '../ui/TableRow.vue'
import ColumnHeader from './ColumnHeader.vue'
import ColumnManager from './ColumnManager.vue'
import ContentLayout from './ContentLayout.vue'
import ContentLayoutSort from './ContentLayoutSort.vue'
import FilterIndicators from './FilterIndicators.vue'
import GroupHeaderRow from './GroupHeaderRow.vue'
import SummaryRow from './SummaryRow.vue'
import TableGroupingMenu from './TableGroupingMenu.vue'
import TableSummaryFooter from './TableSummaryFooter.vue'
import { useCollapsedGroups, useTablePersistence } from './table-grouping'
import TableCellContent from './TableCellContent.vue'
import TableFilters from './TableFilters.vue'
import { showToast } from '../notifications/flash-toasts'
import Slot from '../panel/Slot.vue'
import LiveRecordsPill from '../realtime/LiveRecordsPill.vue'
import { useLiveUpdates } from '../realtime/use-live-updates'
import VirtualSpacerRow from '../schema/VirtualSpacerRow.vue'
import TablePagination from './TablePagination.vue'
import TableTriggerButton from './TableTriggerButton.vue'
import TableViews from './TableViews.vue'
import { Spreadsheet, preloadSpreadsheet } from './spreadsheet-lazy'

export interface DataTableProps {
  table: TableSchema
  /** Context component (`table`, `relationManager:…`, `widget:…`). */
  component?: string
  token?: string
  class?: HTMLAttributes['class']
}

const ALIGN: Record<string, string> = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
  between: 'text-start',
  justify: 'text-justify',
}

const VERTICAL_ALIGN: Record<string, string> = {
  start: 'align-top',
  center: 'align-middle',
  end: 'align-bottom',
}

const props = withDefaults(defineProps<DataTableProps>(), { component: 'table' })

const t = useT()
const panel = usePanel()
const page = usePageSchema()
const runner = useActionRunner()
const token = computed(() => props.token ?? page.value?.token ?? '')
// `deferTotals()`: the total and summaries load after the rows (placeholders meanwhile).
const totalsVersion = useStore(tableTotalsStore)
const component = computed(() => props.component ?? 'table')
const table = computed(() => {
  void totalsVersion.value

  return withTableTotals(
    props.table,
    cachedTableTotals(props.table, component.value),
    tableTotalsFailed(props.table, component.value),
  )
})

watch(
  [() => props.table, () => panel.value.endpoints.tableTotals, token, component, totalsVersion],
  () => {
    void loadTableTotals(props.table, {
      url: panel.value.endpoints.tableTotals,
      token: token.value,
      component: component.value,
    })
  },
  { immediate: true },
)

const context = computed<ActionContext>(() => ({ token: token.value, component: props.component }))
const selection = new TableSelection()
const selectionState = useStore(selection.store)
// `deselectAllRecordsWhenFiltered()`: new filters, search or tab clear the selection.
watch(
  () => table.value.selectionScope,
  (scope) => selection.syncScope(scope),
  { immediate: true },
)
// `maxSelectableRecords()` / `selectGroupsOnly()`.
watch(
  () => table.value,
  (table) => selection.configure(table),
  { immediate: true },
)
const search = ref(table.value.search ?? '')
// A reload in reorder mode (`?reordering=1`) comes back still reordering.
const reordering = ref(Boolean(table.value.reordering))
// `spreadsheet()`: the grid editing mode, toggled from the toolbar.
const spreadsheet = ref(false)
const spreadsheetOpen = computed(
  () => spreadsheet.value && Boolean(table.value.spreadsheet) && !reordering.value,
)
const order = ref<RecordKey[] | null>(null)
const dragKey = ref<RecordKey | null>(null)

const records = computed(() => table.value.records ?? [])
const columns = computed(() =>
  table.value.columns.filter((column) => table.value.visibleColumns.includes(column.name)),
)
const isMobile = useIsMobile()
// Under the mobile preset a phone renders the rows as stacked cards; the server and
// desktop markup keep the table.
const layoutTable = computed(() =>
  mobileTable(table.value, columns.value, { isMobile: isMobile.value, panel: panel.value }),
)
const hasActions = computed(() =>
  records.value.some((record) => record.actions && record.actions.length > 0),
)
const selectable = computed(() => Boolean(table.value.selectable))
// `before-cells` puts the actions before the selection checkbox, `before-columns` after it.
const actionsBeforeCells = computed(
  () => table.value.recordActionsPosition === 'before-cells' && hasActions.value,
)
const actionsBefore = computed(
  () => table.value.recordActionsPosition === 'before-columns' && hasActions.value,
)
const actionsAfter = computed(
  () =>
    (table.value.recordActionsPosition === 'after-columns' ||
      table.value.recordActionsPosition === 'after-cells') &&
    hasActions.value,
)
// Cells around the columns, so group and summary rows line up with the records.
const leadingCells = computed(
  () =>
    Number(actionsBeforeCells.value) +
    Number(reordering.value) +
    Number(selectable.value) +
    Number(actionsBefore.value),
)
const trailingCells = computed(() => Number(actionsAfter.value))
const { collapsed: collapsedGroups, toggle: toggleGroup } = useCollapsedGroups(() => table.value)
useTablePersistence(() => table.value)
const groupedRows = computed(() =>
  groupTableRows(table.value, orderedRecords.value, collapsedGroups.value),
)
// Long pages render only the visible rows (plus a few around them); the spacer rows keep
// the scroll height, `aria-rowcount` / `aria-rowindex` keep the real positions.
const virtual = useVirtualList(
  () => groupedRows.value.length,
  () => virtualizeOptions(table.value.virtualize, VIRTUAL_ESTIMATES.row),
)
const visibleRows = computed(() =>
  virtual.indexes.value.map((position) => ({
    row: groupedRows.value[position] as (typeof groupedRows.value)[number],
    position,
  })),
)
const rowCells = computed(() => columns.value.length + leadingCells.value + trailingCells.value)
const rowKey = (row: (typeof groupedRows.value)[number]) =>
  row.kind === 'record' ? String(row.record.key) : `${row.kind}:${row.group.key}`
// The record of a row as a one-item list, so the record template keeps `record` / `index`.
const recordRow = (row: (typeof groupedRows.value)[number]) => (row.kind === 'record' ? [row] : [])
const showsGroupsOnly = computed(
  () => Boolean(table.value.grouping?.groupsOnly) && (table.value.recordGroups?.length ?? 0) > 0,
)

watch(
  () => table.value.search,
  (value) => {
    search.value = value ?? ''
  },
)

const pushSearch = debounce(
  (value: string) => visitTable(table.value.identifier, { search: value || null }, ['page']),
  table.value.searchDebounce,
)

// Polls refresh only this table (a partial reload of its own schema), share one request
// with other components on the same interval and pause while the tab is hidden.
const pollComponent = usePollComponent()

watch(
  [() => props.component ?? 'table', () => table.value.pollingInterval],
  ([target, pollingInterval], _old, onCleanup) => onCleanup(pollComponent(target, pollingInterval)),
  { immediate: true },
)

// `live()`: refresh in place when records change (broadcast), else poll as a fallback.
const { controller: live, state: liveState } = useLiveUpdates(() => ({
  live: table.value.live,
  target: props.component ?? 'table',
  polling: Boolean(table.value.pollingInterval),
  records: records.value,
}))

// A deferred table arrives without records: fetch them with a partial reload, which the
// server always fills. Ask once per gap so a failing reload cannot loop.
const awaitingRecords = computed(() => Boolean(table.value.deferLoading) && !table.value.records)
let deferredRequested = false

watch(
  awaitingRecords,
  (awaiting) => {
    if (!awaiting) {
      deferredRequested = false
      return
    }

    if (deferredRequested || typeof window === 'undefined') return

    deferredRequested = true
    router.reload({ only: resolvePartialProps(['page']) })
  },
  { immediate: true },
)

// Clear selection after a bulk action completes.
const offSuccess = router.on('success', (event) => {
  const flash = pageFlash(event.detail.page).alfakitAction

  if (flash?.deselectRecords) {
    selection.clear()
  }
})

onScopeDispose(() => {
  pushSearch.cancel()
  offSuccess()
})

const bulkContext = computed<ActionContext>(() => ({
  token: token.value,
  component: props.component,
  records: selectionState.value.allSelected ? [] : [...selectionState.value.selected],
  allRecords: selectionState.value.allSelected,
}))

const orderedRecords = computed(() =>
  order.value
    ? order.value
        .map((key) => records.value.find((record) => String(record.key) === String(key)))
        .filter((record): record is TableRecordSchema => Boolean(record))
    : records.value,
)

const finishReorder = async () => {
  // Leave reorder mode even when saving fails, so the table shows the server order again.
  try {
    if (order.value && panel.value.endpoints.tableReorder && panel.value.endpoints.tableCell) {
      await reorderTable(
        { reorder: panel.value.endpoints.tableReorder, cell: panel.value.endpoints.tableCell },
        token.value,
        props.component,
        order.value,
        // Leaving a server-side reorder mode reloads the table anyway.
        { reload: !table.value.reordering },
      )
    }
  } catch (error) {
    showToast({
      id: 'alfakit-reorder-failed',
      title: t('table.reorder_failed', {}, "Couldn't save the new order"),
      body: error instanceof Error ? error.message : String(error),
      status: 'danger',
      format: 'alfakit',
    })
  } finally {
    order.value = null
    reordering.value = false
    stopTableReordering(table.value)
  }
}

const toggleReorder = () => {
  if (reordering.value) {
    void finishReorder()

    return
  }

  // Pagination is off while reordering unless `paginatedWhileReordering()`.
  reordering.value = true
  startTableReordering(table.value)
}

// `reorderRecordsTriggerAction()`: one look per state.
const reorderTrigger = computed(() =>
  triggerButtonView(table.value, reordering.value ? 'reorderRecordsActive' : 'reorderRecords', {
    label: reordering.value
      ? t('table.reorder_stop', {}, 'Done')
      : t('table.reorder_start', {}, 'Reorder'),
    variant: reordering.value ? 'default' : 'outline',
  }),
)
// `loadingSkeleton()`: rows of placeholders over the table while it reloads.
const loadingState = useStore(tableLoadingStore)
const showSkeleton = computed(
  () =>
    Boolean(table.value.loadingSkeleton) &&
    isTableLoading(loadingState.value, table.value.identifier),
)

const findAction = (
  record: TableRecordSchema,
  name: string | undefined,
): ActionSchema | undefined => {
  const flat = (record.actions ?? []).flatMap((item: AnyActionSchema) =>
    'actions' in item ? item.actions : [item],
  )

  return flat.find((item): item is ActionSchema => 'name' in item && item.name === name)
}

const rowClick = (record: TableRecordSchema) => {
  if (reordering.value) return

  if (table.value.recordAction) {
    const action = findAction(record, table.value.recordAction)

    if (action) {
      void runner.trigger(action, { ...context.value, record: record.key })

      return
    }
  }

  if (record.url) {
    if (record.openUrlInNewTab) window.open(record.url, '_blank', 'noopener')
    else router.visit(record.url)
  }
}

const cellAction = (record: TableRecordSchema, name: string | undefined) => {
  const action = findAction(record, name)

  if (action) void runner.trigger(action, { ...context.value, record: record.key })
}

const onDropRow = (index: number) => {
  if (dragKey.value === null) return

  const keys = orderedRecords.value.map((item) => item.key)
  const from = keys.findIndex((key) => String(key) === String(dragKey.value))
  const [moved] = keys.splice(from, 1)

  if (moved !== undefined) keys.splice(index, 0, moved)

  order.value = keys
  dragKey.value = null
}

// Live-region text announced after a keyboard move in reorder mode.
const announcement = ref('')

// Keyboard alternative to drag-and-drop: the move up/down buttons in reorder mode.
const moveRow = (index: number, offset: -1 | 1) => {
  const keys = orderedRecords.value.map((item) => item.key)
  const target = index + offset

  if (target < 0 || target >= keys.length) return

  order.value = moveListItem(keys, index, target)
  announcement.value = t(
    'table.row_moved',
    { position: target + 1, total: keys.length },
    'Row moved to position :position of :total',
  )
}

const onSearchInput = (value: string) => {
  search.value = value

  if (!table.value.searchOnBlur) pushSearch(value)
}

const clearSearch = () => {
  search.value = ''
  pushSearch('')
  pushSearch.flush()
}

// Simple, cursor and appending pagination don't count the records.
const total = computed(() => paginationTotal(table.value.pagination))
const selectedCount = computed(() =>
  selectionState.value.allSelected
    ? (total.value ?? records.value.length)
    : selectionState.value.selected.size,
)
// With column groups, the leading / trailing cells and ungrouped columns span both header
// rows; grouped columns get their own header in the second row.
const groupRow = computed(() => columnGroupHeaderRow(columns.value, table.value.columnGroups))
const headerRowSpan = computed(() => (groupRow.value ? 2 : undefined))
const groupedColumns = computed(() =>
  columns.value.filter((column) => isGroupedColumn(column.name, table.value.columnGroups)),
)
const isClickable = (record: TableRecordSchema) =>
  !reordering.value && Boolean(record.url || table.value.recordAction)
const pageSelection = computed(() => {
  // Read the store so the state follows selection changes.
  void selectionState.value

  return pageSelectionState(selection, records.value)
})
// The column whose cell holds a clickable row's focusable link or button.
const primaryColumn = computed(() => primaryColumnName(columns.value))
const isPrimaryCell = (record: TableRecordSchema, column: string) =>
  isClickable(record) && column === primaryColumn.value
const isClickDisabled = (record: TableRecordSchema, column: string) =>
  Boolean(record.cells[column]?.disabledClick)
const isWrapped = (column: TableSchema['columns'][number]) =>
  Boolean((column as { wrap?: boolean }).wrap)
const isSelected = (key: RecordKey) =>
  selectionState.value.allSelected || selectionState.value.selected.has(String(key))
const choice = useChoice()
// Read the store so these follow selection changes.
const selectionFull = computed(() => {
  void selectionState.value

  return selection.isFull
})
const canSelect = (key: RecordKey) => {
  void selectionState.value

  return selection.canSelect(key)
}
const recordContext = (record: TableRecordSchema): ActionContext => ({
  ...context.value,
  record: record.key,
  arguments: selectedRecordsArguments(selectionState.value, record.actions),
})
const filtersAt = computed(() => filtersPlacement(table.value.filtersLayout))
const sidebarFilters = computed(() => filtersAt.value === 'before' || filtersAt.value === 'after')
const stacked = computed(() => Boolean(table.value.stackedOnMobile))
const groupsOnlySelection = computed(
  () => selectable.value && Boolean(table.value.selectGroupsOnly),
)
const groupSelection = (group: string) => {
  void selectionState.value

  return selection.groupState(group, records.value)
}
const toggleGroupSelection = (group: string, checked: boolean) =>
  checked
    ? selection.selectGroup(group, records.value)
    : selection.deselectGroup(group, records.value)
const [DefineSurface, ReuseSurface] = createReusableTemplate()
</script>

<template>
  <div data-slot="table-block" :class="cn('flex flex-col gap-4', props.class)">
    <div class="flex flex-col gap-3">
      <Slot name="table.header.before" :scope="props.component" />
      <div
        v-if="table.heading || table.description || table.headerActions?.length"
        class="flex flex-wrap items-start justify-between gap-3"
      >
        <div>
          <h3 v-if="table.heading" class="text-base font-semibold">
            {{ table.heading }}
          </h3>
          <p v-if="table.description" class="text-muted-foreground text-sm">
            {{ table.description }}
          </p>
        </div>
        <ActionList
          v-if="table.headerActions"
          :actions="table.headerActions"
          :context="context"
          size="sm"
        />
      </div>
      <Slot name="table.header.after" :scope="props.component" />
      <Slot name="table.toolbar.before" :scope="props.component" />
      <TableViews v-if="table.views" :table="table" :token="token" :component="props.component" />
      <div class="flex flex-wrap items-center gap-2">
        <Slot name="table.toolbar.search.before" :scope="props.component" />
        <div v-if="table.searchable" class="relative min-w-48 flex-1 sm:max-w-xs">
          <Icon
            name="alfakit::tables.search-field"
            :fallback="SearchIcon"
            class="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            :model-value="search"
            :placeholder="table.searchPlaceholder"
            class="h-8 ps-8"
            :aria-label="t('search', {}, 'Search')"
            @update:model-value="onSearchInput"
            @blur="table.searchOnBlur && pushSearch(search)"
            @keydown.enter="pushSearch.flush()"
          />
          <button
            v-if="search"
            type="button"
            class="text-muted-foreground hover:text-foreground absolute end-2 top-1/2 -translate-y-1/2"
            :aria-label="t('clear', {}, 'Clear')"
            @click="clearSearch"
          >
            <XIcon class="size-4" />
          </button>
        </div>
        <Slot name="table.toolbar.search.after" :scope="props.component" />
        <Slot name="table.toolbar.start" :scope="props.component" />
        <span class="flex-1" />
        <Slot name="table.toolbar.end" :scope="props.component" />
        <Slot name="table.toolbar.reorder-trigger.before" :scope="props.component" />
        <TableTriggerButton
          v-if="table.reorderable && reorderTrigger"
          :view="reorderTrigger"
          :aria-pressed="reordering"
          @click="toggleReorder"
        >
          <template #icon
            ><Icon name="alfakit::tables.actions.enable-reordering" :fallback="GripVerticalIcon"
          /></template>
        </TableTriggerButton>
        <Slot name="table.toolbar.reorder-trigger.after" :scope="props.component" />
        <Button
          v-if="table.spreadsheet && !reordering"
          type="button"
          :variant="spreadsheetOpen ? 'default' : 'outline'"
          size="sm"
          data-slot="spreadsheet-trigger"
          :aria-pressed="spreadsheetOpen"
          @click="spreadsheet = !spreadsheet"
          @mouseenter="preloadSpreadsheet"
          @focus="preloadSpreadsheet"
        >
          <Icon name="alfakit::tables.actions.spreadsheet" :fallback="Table2Icon" />
          {{ t('table.spreadsheet.open', {}, 'Edit as spreadsheet') }}
        </Button>
        <ContentLayoutSort v-if="layoutTable.contentLayout" :table="table" :columns="columns" />
        <Slot name="table.toolbar.grouping-selector.before" :scope="props.component" />
        <TableGroupingMenu :table="table" />
        <Slot name="table.toolbar.grouping-selector.after" :scope="props.component" />
        <TableFilters v-if="filtersAt === 'toolbar'" :table="table" :component="props.component" />
        <Slot name="table.toolbar.column-manager-trigger.before" :scope="props.component" />
        <ColumnManager :table="table" :token="token" :component="props.component" />
        <Slot name="table.toolbar.column-manager-trigger.after" :scope="props.component" />
      </div>
      <Slot name="table.toolbar.after" :scope="props.component" />
      <TableFilters v-if="filtersAt === 'above'" :table="table" :component="props.component" />
      <FilterIndicators v-if="!table.hiddenFilterIndicators" :table="table" />
      <Slot name="table.filter-indicators" :scope="props.component" />
      <LiveRecordsPill
        v-if="live && table.live?.newRecordsIndicator"
        :live="live"
        :pending="liveState.pending"
      />
    </div>

    <div
      v-if="selectable && selectedCount > 0 && table.bulkActions"
      class="bg-primary/5 border-primary/20 flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm"
    >
      <span class="font-medium">{{
        choice('table.selected', selectedCount, {}, ':count selected')
      }}</span>
      <Slot name="table.selection-indicator.actions.before" :scope="props.component" />
      <Button
        v-if="
          !selectionState.allSelected &&
          total !== null &&
          total > records.length &&
          canSelectAllRecords(table)
        "
        type="button"
        variant="link"
        size="sm"
        @click="selection.selectAll()"
      >
        {{ t('table.select_all', {}, 'Select all') }} ({{ total }})
      </Button>
      <Button type="button" variant="link" size="sm" @click="selection.clear()">{{
        t('table.deselect_all', {}, 'Deselect all')
      }}</Button>
      <Slot name="table.selection-indicator.actions.after" :scope="props.component" />
      <span v-if="selectionFull" class="text-muted-foreground text-xs">{{
        choice(
          'table.max_selected',
          table.maxSelectableRecords ?? 0,
          {},
          'You can select up to :count records',
        )
      }}</span>
      <span class="flex-1" />
      <ActionList :actions="table.bulkActions" :context="bulkContext" size="sm" />
    </div>

    <Slot name="table.content.before" :scope="props.component" />
    <DefineSurface>
      <div
        data-surface="table"
        :aria-busy="showSkeleton || undefined"
        class="bg-card relative overflow-hidden rounded-xl border shadow-xs"
      >
        <div
          v-if="showSkeleton"
          data-slot="table-loading-skeleton"
          aria-hidden="true"
          class="bg-card/80 absolute inset-0 z-10 flex flex-col gap-3 p-4"
        >
          <div
            v-for="index in skeletonRowCount(records)"
            :key="index"
            class="bg-muted h-6 animate-pulse rounded-md"
          />
        </div>
        <div v-if="awaitingRecords" class="text-muted-foreground p-8 text-center text-sm">
          {{ t('loading', {}, 'Loading…') }}
        </div>
        <div
          v-else-if="records.length === 0 && !showsGroupsOnly"
          class="flex flex-col items-center gap-3 px-6 py-12 text-center"
        >
          <div
            class="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full"
          >
            <Icon :name="table.emptyState.icon" class="size-6" />
          </div>
          <div>
            <p class="font-medium">{{ table.emptyState.heading }}</p>
            <p v-if="table.emptyState.description" class="text-muted-foreground text-sm">
              {{ table.emptyState.description }}
            </p>
          </div>
          <ActionList
            v-if="table.emptyState.actions"
            :actions="table.emptyState.actions"
            :context="context"
            size="sm"
          />
        </div>
        <ContentLayout
          v-else-if="layoutTable.contentLayout"
          :table="layoutTable"
          :records="records"
          :columns="columns"
          :token="token"
          :component="props.component"
          :context="context"
          :selectable="selectable"
          :selection="selection"
          :selection-state="selectionState"
          @record-click="rowClick"
        />
        <Table
          v-else
          :aria-rowcount="
            virtual.range.value.active ? groupedRows.length + (groupRow ? 2 : 1) : undefined
          "
          :data-stacked-on-mobile="stacked || undefined"
          :class="cn(stacked && STACKED_TABLE_CLASSES.table)"
        >
          <TableHeader :class="cn(stacked && STACKED_TABLE_CLASSES.header)">
            <TableRow class="hover:bg-transparent">
              <TableHead v-if="actionsBeforeCells" :rowspan="headerRowSpan" class="w-0">{{
                t('actions', {}, 'Actions')
              }}</TableHead>
              <TableHead v-if="reordering" :rowspan="headerRowSpan" class="w-16">
                <span class="sr-only">{{ t('table.reorder_start', {}, 'Reorder') }}</span>
              </TableHead>
              <TableHead v-if="selectable" :rowspan="headerRowSpan" class="w-10">
                <Checkbox
                  v-if="!groupsOnlySelection"
                  :model-value="pageSelection"
                  :aria-label="t('table.select_page', {}, 'Select page')"
                  @update:model-value="
                    $event === true
                      ? selection.selectPage(records)
                      : selection.deselectPage(records)
                  "
                />
              </TableHead>
              <TableHead v-if="actionsBefore" :rowspan="headerRowSpan" class="w-0">{{
                t('actions', {}, 'Actions')
              }}</TableHead>
              <template v-if="groupRow">
                <template v-for="cell in groupRow" :key="cell.key">
                  <TableHead
                    v-if="cell.group"
                    :colspan="cell.span"
                    scope="colgroup"
                    :class="
                      cn(
                        'border-b',
                        ALIGN[cell.group.alignment ?? 'center'],
                        cell.group.wrapHeader ? 'whitespace-normal' : undefined,
                      )
                    "
                    v-bind="cell.group.extraHeaderAttributes"
                    >{{ cell.group.label }}</TableHead
                  >
                  <ColumnHeader
                    v-else-if="cell.column"
                    :table="table"
                    :column="cell.column"
                    :component="props.component"
                    :row-span="2"
                  />
                </template>
              </template>
              <template v-else>
                <ColumnHeader
                  v-for="column in columns"
                  :key="column.name"
                  :table="table"
                  :column="column"
                  :component="props.component"
                />
              </template>
              <TableHead v-if="actionsAfter" :rowspan="headerRowSpan" class="w-0 text-end">
                <span class="sr-only">{{ t('actions', {}, 'Actions') }}</span>
              </TableHead>
            </TableRow>
            <TableRow v-if="groupRow" class="hover:bg-transparent">
              <ColumnHeader
                v-for="column in groupedColumns"
                :key="column.name"
                :table="table"
                :column="column"
                :component="props.component"
              />
            </TableRow>
          </TableHeader>
          <TableBody :ref="virtual.attach" :class="cn(stacked && STACKED_TABLE_CLASSES.body)">
            <VirtualSpacerRow :height="virtual.range.value.before" :col-span="rowCells" />
            <template v-for="{ row, position } in visibleRows" :key="rowKey(row)">
              <GroupHeaderRow
                v-if="row.kind === 'group'"
                :group="row.group"
                :collapsed="row.collapsed"
                :collapsible="Boolean(table.grouping?.collapsible && !table.grouping.groupsOnly)"
                :col-span="columns.length + leadingCells + trailingCells"
                :selection="
                  groupsOnlySelection
                    ? {
                        checked: groupSelection(row.group.key),
                        onChange: (checked: boolean) =>
                          toggleGroupSelection(row.group.key, checked),
                      }
                    : undefined
                "
                @toggle="toggleGroup(row.group.key)"
              />
              <SummaryRow
                v-else-if="row.kind === 'summary'"
                :columns="columns"
                :values="row.summary"
                :leading="leadingCells"
                :trailing="trailingCells"
              />
              <TableRow
                v-for="{ record, index } in recordRow(row)"
                :key="String(record.key)"
                :ref="virtual.item"
                :data-index="position"
                :aria-rowindex="
                  virtual.range.value.active ? position + (groupRow ? 3 : 2) : undefined
                "
                :data-state="isSelected(record.key) ? 'selected' : undefined"
                :draggable="reordering"
                :class="
                  cn(
                    isClickable(record) && 'cursor-pointer',
                    table.striped && index % 2 === 1 && 'bg-muted/30',
                    stacked && STACKED_TABLE_CLASSES.row,
                    record.classes,
                  )
                "
                @dragstart="dragKey = record.key"
                @dragover.prevent
                @drop="onDropRow(index)"
                @click="isClickable(record) && rowClick(record)"
              >
                <TableCell v-if="reordering" class="w-16 cursor-grab">
                  <div class="flex items-center">
                    <Icon
                      name="alfakit::tables.reorder.handle"
                      :fallback="GripVerticalIcon"
                      class="text-muted-foreground size-4"
                      aria-hidden="true"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      :aria-label="t('form.move_up', {}, 'Move up')"
                      :disabled="index === 0"
                      @click="moveRow(index, -1)"
                    >
                      <ChevronUpIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      :aria-label="t('form.move_down', {}, 'Move down')"
                      :disabled="index === orderedRecords.length - 1"
                      @click="moveRow(index, 1)"
                    >
                      <ChevronDownIcon />
                    </Button>
                  </div>
                </TableCell>
                <TableCell
                  v-if="actionsBeforeCells"
                  :class="cn(stacked && STACKED_TABLE_CLASSES.actionsCell)"
                  @click.stop
                >
                  <ActionList
                    v-if="record.actions"
                    :actions="record.actions"
                    :context="recordContext(record)"
                    size="sm"
                    align="end"
                    class="flex-nowrap"
                  />
                </TableCell>
                <TableCell
                  v-if="selectable"
                  :class="cn(stacked && STACKED_TABLE_CLASSES.controlCell)"
                  @click.stop
                >
                  <Checkbox
                    v-if="record.selectable !== false"
                    :model-value="isSelected(record.key)"
                    :disabled="!canSelect(record.key)"
                    :aria-label="t('table.select_row', {}, 'Select row')"
                    @update:model-value="
                      selection.toggle(record.key, $event === true, record.group ?? '')
                    "
                  />
                </TableCell>
                <TableCell
                  v-if="actionsBefore"
                  :class="cn(stacked && STACKED_TABLE_CLASSES.actionsCell)"
                  @click.stop
                >
                  <ActionList
                    v-if="record.actions"
                    :actions="record.actions"
                    :context="recordContext(record)"
                    size="sm"
                    align="end"
                    class="flex-nowrap"
                  />
                </TableCell>
                <TableCell
                  v-for="column in columns"
                  :key="column.name"
                  :data-click-disabled="isClickDisabled(record, column.name) || undefined"
                  :class="
                    cn(
                      isClickDisabled(record, column.name) && 'cursor-default',
                      ALIGN[column.alignment ?? 'start'],
                      column.verticalAlignment && VERTICAL_ALIGN[column.verticalAlignment],
                      isWrapped(column) && 'whitespace-normal',
                      record.cells[column.name]?.hidden && 'invisible',
                      columnVisibilityClasses(column),
                      stacked && stackedCellClasses(column),
                    )
                  "
                  :title="record.cells[column.name]?.tooltip"
                  v-bind="record.cells[column.name]?.extraAttributes"
                  @click="isClickDisabled(record, column.name) && $event.stopPropagation()"
                >
                  <span v-if="stacked" :class="STACKED_TABLE_CLASSES.label" aria-hidden="true">{{
                    column.label
                  }}</span>
                  <!-- `disabledClick()`: the cell is plain content and swallows the row click. -->
                  <TableCellContent
                    v-if="isClickDisabled(record, column.name)"
                    :column="column"
                    :cell="record.cells[column.name] ?? {}"
                    :record-key="record.key"
                    :token="token"
                    :component="props.component"
                  />
                  <template v-else-if="record.cells[column.name]?.url">
                    <a
                      v-if="record.cells[column.name]?.openUrlInNewTab"
                      :href="record.cells[column.name]?.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="hover:underline"
                      @click.stop
                    >
                      <TableCellContent
                        :column="column"
                        :cell="record.cells[column.name] ?? {}"
                        :record-key="record.key"
                        :token="token"
                        :component="props.component"
                      />
                      <span class="sr-only">
                        {{ t('opens_in_new_tab', {}, '(opens in a new tab)') }}</span
                      >
                    </a>
                    <Link
                      v-else
                      :href="record.cells[column.name]?.url ?? '#'"
                      class="hover:underline"
                      @click.stop
                    >
                      <TableCellContent
                        :column="column"
                        :cell="record.cells[column.name] ?? {}"
                        :record-key="record.key"
                        :token="token"
                        :component="props.component"
                      />
                    </Link>
                  </template>
                  <button
                    v-else-if="record.cells[column.name]?.action && record.actions"
                    type="button"
                    class="text-start hover:underline"
                    @click.stop="cellAction(record, record.cells[column.name]?.action)"
                  >
                    <TableCellContent
                      :column="column"
                      :cell="record.cells[column.name] ?? {}"
                      :record-key="record.key"
                      :token="token"
                      :component="props.component"
                    />
                  </button>
                  <!-- Keyboard path for a clickable row: its primary cell is a real link or button. -->
                  <template v-else-if="isPrimaryCell(record, column.name)">
                    <button
                      v-if="table.recordAction || !record.url"
                      type="button"
                      class="focus-visible:ring-ring/50 rounded-sm text-start outline-none focus-visible:ring-[3px]"
                      @click.stop="rowClick(record)"
                    >
                      <TableCellContent
                        :column="column"
                        :cell="record.cells[column.name] ?? {}"
                        :record-key="record.key"
                        :token="token"
                        :component="props.component"
                      />
                    </button>
                    <a
                      v-else-if="record.openUrlInNewTab"
                      :href="record.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-[3px]"
                      @click.stop
                    >
                      <TableCellContent
                        :column="column"
                        :cell="record.cells[column.name] ?? {}"
                        :record-key="record.key"
                        :token="token"
                        :component="props.component"
                      />
                      <span class="sr-only">
                        {{ t('opens_in_new_tab', {}, '(opens in a new tab)') }}</span
                      >
                    </a>
                    <Link
                      v-else
                      :href="record.url"
                      class="focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-[3px]"
                      @click.stop
                    >
                      <TableCellContent
                        :column="column"
                        :cell="record.cells[column.name] ?? {}"
                        :record-key="record.key"
                        :token="token"
                        :component="props.component"
                      />
                    </Link>
                  </template>
                  <TableCellContent
                    v-else
                    :column="column"
                    :cell="record.cells[column.name] ?? {}"
                    :record-key="record.key"
                    :token="token"
                    :component="props.component"
                  />
                </TableCell>
                <TableCell
                  v-if="actionsAfter"
                  :class="cn('text-end', stacked && STACKED_TABLE_CLASSES.actionsCell)"
                  @click.stop
                >
                  <ActionList
                    v-if="record.actions"
                    :actions="record.actions"
                    :context="recordContext(record)"
                    size="sm"
                    align="end"
                    class="flex-nowrap"
                  />
                </TableCell>
              </TableRow>
            </template>
            <VirtualSpacerRow :height="virtual.range.value.after" :col-span="rowCells" />
          </TableBody>
          <TableSummaryFooter
            :table="table"
            :columns="columns"
            :leading="leadingCells"
            :trailing="trailingCells"
            :class="cn(stacked && STACKED_TABLE_CLASSES.footer)"
          />
        </Table>
      </div>
    </DefineSurface>
    <!-- Sidebar filters: beside the table from `lg`, above it on smaller screens. -->
    <div
      v-if="sidebarFilters"
      data-slot="table-filters-layout"
      class="flex flex-col gap-4 lg:flex-row lg:items-start"
    >
      <TableFilters v-if="filtersAt === 'before'" :table="table" :component="props.component" />
      <div class="min-w-0 flex-1">
        <Spreadsheet
          v-if="spreadsheetOpen"
          :table="table"
          :token="token"
          :component="props.component"
          @close="spreadsheet = false"
        />
        <ReuseSurface v-else />
      </div>
      <TableFilters v-if="filtersAt === 'after'" :table="table" :component="props.component" />
    </div>
    <template v-else>
      <Spreadsheet
        v-if="spreadsheetOpen"
        :table="table"
        :token="token"
        :component="props.component"
        @close="spreadsheet = false"
      />
      <ReuseSurface v-else />
    </template>
    <Slot name="table.content.after" :scope="props.component" />
    <TableFilters v-if="filtersAt === 'below'" :table="table" :component="props.component" />
    <TablePagination :table="table" />
    <span aria-live="polite" aria-atomic="true" class="sr-only">{{ announcement }}</span>
  </div>
</template>
