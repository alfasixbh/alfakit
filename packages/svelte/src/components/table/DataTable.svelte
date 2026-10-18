<script lang="ts">
  import { uniqueKey } from '../../lib/keys'
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
    ariaSort,
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
  import { Link, router } from '@inertiajs/svelte'
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down'
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up'
  import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import ChevronUpIcon from '@lucide/svelte/icons/chevron-up'
  import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical'
  import SearchIcon from '@lucide/svelte/icons/search'
  import Table2Icon from '@lucide/svelte/icons/table-2'
  import XIcon from '@lucide/svelte/icons/x'
  import { onDestroy, untrack } from 'svelte'
  import {
    useActionRunner,
    useChoice,
    usePageSchema,
    usePanel,
    usePollComponent,
    useT,
  } from '../../context.svelte'
  import { useIsMobile } from '../../hooks/mobile.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { useVirtualList } from '../../hooks/virtual.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import ActionList from '../actions/ActionList.svelte'
  import { Button } from '../ui/button'
  import { Checkbox } from '../ui/checkbox'
  import { Input } from '../ui/input'
  import { Spinner } from '../ui/spinner'
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
  import Slot from '../panel/Slot.svelte'
  import VirtualSpacerRow from '../schema/VirtualSpacerRow.svelte'
  import ColumnManager from './ColumnManager.svelte'
  import ContentLayout from './ContentLayout.svelte'
  import ContentLayoutSort from './ContentLayoutSort.svelte'
  import FilterIndicators from './FilterIndicators.svelte'
  import GroupHeaderRow from './GroupHeaderRow.svelte'
  import SummaryRow from './SummaryRow.svelte'
  import TableGroupingMenu from './TableGroupingMenu.svelte'
  import TableSummaryFooter from './TableSummaryFooter.svelte'
  import { useCollapsedGroups, useTablePersistence } from './table-grouping.svelte'
  import TableCellContent from './TableCellContent.svelte'
  import TableFilters from './TableFilters.svelte'
  import { showToast } from '../notifications/toast'
  import TablePagination from './TablePagination.svelte'
  import TableTriggerButton from './TableTriggerButton.svelte'
  import TableViews from './TableViews.svelte'
  import SpreadsheetLazy, { spreadsheetLoader } from './SpreadsheetLazy.svelte'
  import { extraProps } from '../../lib/attributes'
  import LiveRecordsPill from '../realtime/LiveRecordsPill.svelte'
  import { useLiveUpdates } from '../realtime/live-updates.svelte'

  interface Props {
    table: TableSchema
    /** Context component (`table`, `relationManager:…`, `widget:…`). */
    component?: string
    token?: string
    class?: string
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

  let {
    table: serverTable,
    component = 'table',
    token: tokenProp,
    class: className,
  }: Props = $props()

  const t = useT()
  const choice = useChoice()
  const panel = usePanel()
  const page = usePageSchema()
  const runner = useActionRunner()
  const token = $derived(tokenProp ?? page?.token ?? '')
  // `deferTotals()`: the total and summaries load after the rows (placeholders meanwhile).
  const totalsVersion = useStore(tableTotalsStore)
  const table = $derived.by(() => {
    void totalsVersion.current

    return withTableTotals(
      serverTable,
      cachedTableTotals(serverTable, component),
      tableTotalsFailed(serverTable, component),
    )
  })

  $effect(() => {
    void totalsVersion.current
    void loadTableTotals(serverTable, { url: panel.endpoints.tableTotals, token, component })
  })

  const context = $derived<ActionContext>({ token, component })
  const selection = new TableSelection()
  const selectionState = useStore(selection.store)
  // `deselectAllRecordsWhenFiltered()`: new filters, search or tab clear the selection.
  $effect.pre(() => {
    selection.syncScope(table.selectionScope)
  })
  // `maxSelectableRecords()` / `selectGroupsOnly()`.
  $effect.pre(() => {
    selection.configure(table)
  })
  // Local search text; follow the server only when its search value actually changes, so
  // unrelated reloads (polling, actions) don't wipe what the user is typing.
  let search = $state(untrack(() => table.search ?? ''))
  let syncedSearch = untrack(() => table.search)

  $effect.pre(() => {
    const next = table.search

    if (next !== syncedSearch) {
      syncedSearch = next
      search = next ?? ''
    }
  })
  // A reload in reorder mode (`?reordering=1`) comes back still reordering.
  let reordering = $state(untrack(() => Boolean(table.reordering)))
  // `spreadsheet()`: the grid editing mode, toggled from the toolbar.
  let spreadsheet = $state(false)
  const spreadsheetOpen = $derived(spreadsheet && Boolean(table.spreadsheet) && !reordering)
  let order = $state<RecordKey[] | null>(null)
  let dragKey = $state<RecordKey | null>(null)

  const records = $derived(table.records ?? [])
  const columns = $derived(
    table.columns.filter((column) => table.visibleColumns.includes(column.name)),
  )
  const isMobile = useIsMobile()
  // Under the mobile preset a phone renders the rows as stacked cards; the server and
  // desktop markup keep the table.
  const layoutTable = $derived(mobileTable(table, columns, { isMobile: isMobile.current, panel }))
  const hasActions = $derived(records.some((record) => record.actions && record.actions.length > 0))
  const selectable = $derived(Boolean(table.selectable))
  // `before-cells` puts the actions before the selection checkbox, `before-columns` after it.
  const actionsBeforeCells = $derived(table.recordActionsPosition === 'before-cells' && hasActions)
  const actionsBefore = $derived(table.recordActionsPosition === 'before-columns' && hasActions)
  const actionsAfter = $derived(
    (table.recordActionsPosition === 'after-columns' ||
      table.recordActionsPosition === 'after-cells') &&
      hasActions,
  )
  // Cells around the columns, so group and summary rows line up with the records.
  const leadingCells = $derived(
    Number(actionsBeforeCells) + Number(reordering) + Number(selectable) + Number(actionsBefore),
  )
  const trailingCells = $derived(Number(actionsAfter))
  const groups = useCollapsedGroups(() => table)
  useTablePersistence(() => table)
  const showsGroupsOnly = $derived(
    Boolean(table.grouping?.groupsOnly) && (table.recordGroups?.length ?? 0) > 0,
  )

  const pushSearch = debounce(
    (value: string) => visitTable(table.identifier, { search: value || null }, ['page']),
    untrack(() => table.searchDebounce),
  )

  // Polls refresh only this table (a partial reload of its own schema), share one request
  // with other components on the same interval and pause while the tab is hidden. Derived
  // primitives keep the subscription across reloads that bring a new `table` object.
  const pollTarget = $derived(component)
  const pollingInterval = $derived(table.pollingInterval)
  const pollComponent = usePollComponent()

  $effect(() => pollComponent(pollTarget, pollingInterval))

  // `live()`: refresh in place when records change (broadcast), else poll as a fallback.
  const live = useLiveUpdates(() => ({
    live: table.live,
    target: component,
    polling: Boolean(table.pollingInterval),
    records,
  }))

  // A deferred table arrives without records: fetch them with a partial reload, which the
  // server always fills. Ask once per gap so a failing reload cannot loop.
  const awaitingRecords = $derived(Boolean(table.deferLoading) && !table.records)
  let deferredRequested = false

  $effect(() => {
    if (!awaitingRecords) {
      deferredRequested = false
      return
    }

    if (deferredRequested) return

    deferredRequested = true
    router.reload({ only: resolvePartialProps(['page']) })
  })

  // Clear selection after a bulk action completes.
  const offSuccess = router.on('success', (event) => {
    const flash = pageFlash(event.detail.page).alfakitAction

    if (flash?.deselectRecords) {
      selection.clear()
    }
  })

  onDestroy(() => {
    offSuccess()
    pushSearch.cancel()
  })

  // The column whose sort was just clicked shows a spinner until its records arrive.
  let sortingColumn = $state<string | null>(null)

  const sort = (column: string) => {
    const direction =
      table.sort?.column === column && table.sort.direction === 'asc' ? 'desc' : 'asc'
    sortingColumn = column
    visitTable(table.identifier, { sort: column, direction }, ['page'], {
      onFinish: () => {
        sortingColumn = null
      },
    })
  }

  const bulkContext = $derived<ActionContext>({
    token,
    component,
    records: selectionState.current.allSelected ? [] : [...selectionState.current.selected],
    allRecords: selectionState.current.allSelected,
  })

  const orderedRecords = $derived(
    order
      ? order
          .map((key) => records.find((record) => String(record.key) === String(key)))
          .filter((record): record is TableRecordSchema => Boolean(record))
      : records,
  )
  // Long pages render only the visible rows (plus a few around them); the spacer rows keep
  // the scroll height, `aria-rowcount` / `aria-rowindex` keep the real positions.
  const rows = $derived(groupTableRows(table, orderedRecords, groups.collapsed))
  const virtual = useVirtualList(
    () => rows.length,
    () => virtualizeOptions(table.virtualize, VIRTUAL_ESTIMATES.row),
  )
  const visibleRows = $derived(
    virtual.indexes.map((position) => ({ row: rows[position] as (typeof rows)[number], position })),
  )
  const rowCells = $derived(columns.length + leadingCells + trailingCells)

  const finishReorder = async () => {
    // Leave reorder mode even when saving fails, so the table shows the server order again.
    try {
      if (order && panel.endpoints.tableReorder && panel.endpoints.tableCell) {
        await reorderTable(
          { reorder: panel.endpoints.tableReorder, cell: panel.endpoints.tableCell },
          token,
          component,
          order,
          // Leaving a server-side reorder mode reloads the table anyway.
          { reload: !table.reordering },
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
      order = null
      reordering = false
      stopTableReordering(table)
    }
  }

  const toggleReorder = () => {
    if (reordering) {
      void finishReorder()

      return
    }

    // Pagination is off while reordering unless `paginatedWhileReordering()`.
    reordering = true
    startTableReordering(table)
  }

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
    if (reordering) return

    if (table.recordAction) {
      const action = findAction(record, table.recordAction)

      if (action) {
        void runner.trigger(action, { ...context, record: record.key })

        return
      }
    }

    if (record.url) {
      if (record.openUrlInNewTab) window.open(record.url, '_blank', 'noopener')
      else router.visit(record.url)
    }
  }

  const onDropRow = (index: number) => {
    if (dragKey === null) return

    const keys = orderedRecords.map((item) => item.key)
    const from = keys.findIndex((key) => String(key) === String(dragKey))
    const [moved] = keys.splice(from, 1)

    if (moved !== undefined) keys.splice(index, 0, moved)

    order = keys
    dragKey = null
  }

  // Live-region text announced after a keyboard move in reorder mode.
  let announcement = $state('')

  // Keyboard alternative to drag-and-drop: the move up/down buttons in reorder mode.
  const moveRow = (index: number, offset: -1 | 1) => {
    const keys = orderedRecords.map((item) => item.key)
    const target = index + offset

    if (target < 0 || target >= keys.length) return

    order = moveListItem(keys, index, target)
    announcement = t(
      'table.row_moved',
      { position: target + 1, total: keys.length },
      'Row moved to position :position of :total',
    )
  }

  // The column whose cell holds a clickable row's focusable link or button.
  const primaryColumn = $derived(primaryColumnName(columns))

  // Simple, cursor and appending pagination don't count the records.
  const total = $derived(paginationTotal(table.pagination))
  const selectedCount = $derived(
    selectionState.current.allSelected
      ? (total ?? records.length)
      : selectionState.current.selected.size,
  )
  // With column groups, the leading / trailing cells and ungrouped columns span both header
  // rows; grouped columns get their own header in the second row.
  const groupRow = $derived(columnGroupHeaderRow(columns, table.columnGroups))
  const headerRowSpan = $derived(groupRow ? 2 : undefined)
  const pageSelection = $derived.by(() => {
    void selectionState.current

    return pageSelectionState(selection, records)
  })
  const isSelected = (key: RecordKey) => {
    void selectionState.current

    return selection.isSelected(key)
  }
  const canSelect = (key: RecordKey) => {
    void selectionState.current

    return selection.canSelect(key)
  }
  const groupSelection = (group: string) => {
    void selectionState.current

    return selection.groupState(group, records)
  }
  const selectionFull = $derived.by(() => {
    void selectionState.current

    return selection.isFull
  })
  const filtersAt = $derived(filtersPlacement(table.filtersLayout))
  const stacked = $derived(Boolean(table.stackedOnMobile))
  const groupsOnlySelection = $derived(selectable && Boolean(table.selectGroupsOnly))
  // `reorderRecordsTriggerAction()`: one look per state.
  const reorderTrigger = $derived(
    triggerButtonView(table, reordering ? 'reorderRecordsActive' : 'reorderRecords', {
      label: reordering
        ? t('table.reorder_stop', {}, 'Done')
        : t('table.reorder_start', {}, 'Reorder'),
      variant: reordering ? 'default' : 'outline',
    }),
  )
  const loadingState = useStore(tableLoadingStore)
  const showSkeleton = $derived(
    Boolean(table.loadingSkeleton) && isTableLoading(loadingState.current, table.identifier),
  )
</script>

{#snippet gripIcon()}<Icon
    name="alfakit::tables.actions.enable-reordering"
    fallback={GripVerticalIcon}
  />{/snippet}

{#snippet headerLabel(column: TableSchema['columns'][number], active: boolean)}
  {#if column.sortable}
    <button
      type="button"
      class="hover:text-foreground inline-flex items-center gap-1"
      aria-busy={sortingColumn === column.name || undefined}
      onclick={() => sort(column.name)}
    >
      {column.label}
      {#if sortingColumn === column.name}<Spinner
          data-slot="table-sort-spinner"
          class="size-3.5"
        />{:else if active && table.sort?.direction === 'asc'}<Icon
          name="alfakit::tables.header-cell.sort-asc-button"
          fallback={ArrowUpIcon}
          class="size-3.5"
          aria-hidden="true"
        />{:else if active}<Icon
          name="alfakit::tables.header-cell.sort-desc-button"
          fallback={ArrowDownIcon}
          class="size-3.5"
          aria-hidden="true"
        />{:else}<Icon
          name="alfakit::tables.header-cell.sort-button"
          fallback={ArrowUpDownIcon}
          class="size-3.5 opacity-40"
          aria-hidden="true"
        />{/if}
    </button>
  {:else}
    {column.label}
  {/if}
{/snippet}

<!-- A column's header cell, shared by both header rows when there are column groups. -->
{#snippet columnHeader(column: TableSchema['columns'][number], rowSpan?: number)}
  {@const active = table.sort?.column === column.name}
  <TableHead
    rowspan={rowSpan}
    aria-sort={column.sortable
      ? ariaSort(column.name, table.sort?.column, table.sort?.direction)
      : undefined}
    style={column.width ? `width: ${column.width}` : undefined}
    {...extraProps(
      column.extraHeaderAttributes,
      cn(
        ALIGN[column.alignment ?? 'start'],
        column.wrapHeader ? 'whitespace-normal' : undefined,
        column.grow === false && 'w-0',
        columnVisibilityClasses(column),
      ),
    )}
  >
    <div class="flex flex-col gap-1">
      {#if column.headerTooltip}
        <span title={column.headerTooltip} data-slot="header-tooltip"
          >{@render headerLabel(column, active)}<span class="sr-only">
            ({column.headerTooltip})</span
          ></span
        >
      {:else}
        {@render headerLabel(column, active)}
      {/if}
      <Slot name="table.header-cell" scope={component} data={{ column: column.name }} />
      {#if column.searchable}
        <Input
          type="search"
          value={table.columnSearches?.[column.name] ?? ''}
          placeholder={t('search', {}, 'Search')}
          aria-label={`${t('search', {}, 'Search')} ${column.label}`}
          class="h-7 text-xs font-normal"
          onkeydown={(event) =>
            event.key === 'Enter' &&
            visitTable(
              table.identifier,
              {
                columnSearch: {
                  ...(table.columnSearches ?? {}),
                  [column.name]: (event.currentTarget as HTMLInputElement).value,
                },
              },
              ['page'],
            )}
        />
      {/if}
    </div>
  </TableHead>
{/snippet}

<div data-slot="table-block" class={cn('flex flex-col gap-4', className)}>
  <div class="flex flex-col gap-3">
    <Slot name="table.header.before" scope={component} />
    {#if table.heading || table.description || table.headerActions?.length}
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          {#if table.heading}<h3 class="text-base font-semibold">{table.heading}</h3>{/if}
          {#if table.description}<p class="text-muted-foreground text-sm">
              {table.description}
            </p>{/if}
        </div>
        {#if table.headerActions}<ActionList
            actions={table.headerActions}
            {context}
            size="sm"
          />{/if}
      </div>
    {/if}
    <Slot name="table.header.after" scope={component} />
    <Slot name="table.toolbar.before" scope={component} />
    {#if table.views}<TableViews {table} {token} {component} />{/if}
    <div class="flex flex-wrap items-center gap-2">
      <Slot name="table.toolbar.search.before" scope={component} />
      {#if table.searchable}
        <div class="relative min-w-48 flex-1 sm:max-w-xs">
          <Icon
            name="alfakit::tables.search-field"
            fallback={SearchIcon}
            class="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            value={search}
            placeholder={table.searchPlaceholder}
            oninput={(event) => {
              search = event.currentTarget.value

              if (!table.searchOnBlur) pushSearch(search)
            }}
            onblur={() => table.searchOnBlur && pushSearch(search)}
            onkeydown={(event) => event.key === 'Enter' && pushSearch.flush()}
            class="h-8 ps-8"
            aria-label={t('search', {}, 'Search')}
          />
          {#if search}
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground absolute end-2 top-1/2 -translate-y-1/2"
              aria-label={t('clear', {}, 'Clear')}
              onclick={() => {
                search = ''
                pushSearch('')
                pushSearch.flush()
              }}
            >
              <XIcon class="size-4" />
            </button>
          {/if}
        </div>
      {/if}
      <Slot name="table.toolbar.search.after" scope={component} />
      <Slot name="table.toolbar.start" scope={component} />
      <span class="flex-1"></span>
      <Slot name="table.toolbar.end" scope={component} />
      <Slot name="table.toolbar.reorder-trigger.before" scope={component} />
      {#if table.reorderable && reorderTrigger}
        <TableTriggerButton
          view={reorderTrigger}
          defaultIcon={gripIcon}
          aria-pressed={reordering}
          onclick={toggleReorder}
        />
      {/if}
      <Slot name="table.toolbar.reorder-trigger.after" scope={component} />
      {#if table.spreadsheet && !reordering}
        <Button
          type="button"
          variant={spreadsheetOpen ? 'default' : 'outline'}
          size="sm"
          data-slot="spreadsheet-trigger"
          aria-pressed={spreadsheetOpen}
          onclick={() => (spreadsheet = !spreadsheet)}
          onmouseenter={() => void spreadsheetLoader.load()}
          onfocus={() => void spreadsheetLoader.load()}
        >
          <Icon name="alfakit::tables.actions.spreadsheet" fallback={Table2Icon} />
          {t('table.spreadsheet.open', {}, 'Edit as spreadsheet')}
        </Button>
      {/if}
      {#if layoutTable.contentLayout}<ContentLayoutSort table={layoutTable} {columns} />{/if}
      <Slot name="table.toolbar.grouping-selector.before" scope={component} />
      <TableGroupingMenu {table} />
      <Slot name="table.toolbar.grouping-selector.after" scope={component} />
      {#if filtersAt === 'toolbar'}<TableFilters {table} {component} />{/if}
      <Slot name="table.toolbar.column-manager-trigger.before" scope={component} />
      <ColumnManager {table} {token} {component} />
      <Slot name="table.toolbar.column-manager-trigger.after" scope={component} />
    </div>
    <Slot name="table.toolbar.after" scope={component} />
    {#if filtersAt === 'above'}<TableFilters {table} {component} />{/if}
    {#if !table.hiddenFilterIndicators}<FilterIndicators {table} />{/if}
    <Slot name="table.filter-indicators" scope={component} />
    {#if live.controller && table.live?.newRecordsIndicator}
      <LiveRecordsPill live={live.controller} pending={live.state.pending} />
    {/if}
  </div>

  {#if selectable && selectedCount > 0 && table.bulkActions}
    <div
      class="border-primary/20 bg-primary/5 flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm"
    >
      <span class="font-medium"
        >{choice('table.selected', selectedCount, {}, ':count selected')}</span
      >
      <Slot name="table.selection-indicator.actions.before" scope={component} />
      {#if !selectionState.current.allSelected && total !== null && total > records.length && canSelectAllRecords(table)}
        <Button type="button" variant="link" size="sm" onclick={() => selection.selectAll()}
          >{t('table.select_all', {}, 'Select all')} ({total})</Button
        >
      {/if}
      <Button type="button" variant="link" size="sm" onclick={() => selection.clear()}
        >{t('table.deselect_all', {}, 'Deselect all')}</Button
      >
      <Slot name="table.selection-indicator.actions.after" scope={component} />
      {#if selectionFull}
        <span class="text-muted-foreground text-xs"
          >{choice(
            'table.max_selected',
            table.maxSelectableRecords ?? 0,
            {},
            'You can select up to :count records',
          )}</span
        >
      {/if}
      <span class="flex-1"></span>
      <ActionList actions={table.bulkActions} context={bulkContext} size="sm" />
    </div>
  {/if}

  {#snippet surface()}
    <div
      data-surface="table"
      aria-busy={showSkeleton || undefined}
      class="bg-card relative overflow-hidden rounded-xl border shadow-xs"
    >
      {#if showSkeleton}
        <div
          data-slot="table-loading-skeleton"
          aria-hidden="true"
          class="bg-card/80 absolute inset-0 z-10 flex flex-col gap-3 p-4"
        >
          {#each { length: skeletonRowCount(records) } as _, index (index)}
            <div class="bg-muted h-6 animate-pulse rounded-md"></div>
          {/each}
        </div>
      {/if}
      {#if awaitingRecords}
        <div class="text-muted-foreground p-8 text-center text-sm">
          {t('loading', {}, 'Loading…')}
        </div>
      {:else if records.length === 0 && !showsGroupsOnly}
        <div class="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <div
            class="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full"
          >
            <Icon name={table.emptyState.icon} class="size-6" />
          </div>
          <div>
            <p class="font-medium">{table.emptyState.heading}</p>
            {#if table.emptyState.description}<p class="text-muted-foreground text-sm">
                {table.emptyState.description}
              </p>{/if}
          </div>
          {#if table.emptyState.actions}<ActionList
              actions={table.emptyState.actions}
              {context}
              size="sm"
            />{/if}
        </div>
      {:else if layoutTable.contentLayout}
        <ContentLayout
          table={layoutTable}
          {records}
          {columns}
          {token}
          {component}
          {context}
          {selectable}
          {selection}
          {isSelected}
          onRecordClick={rowClick}
        />
      {:else}
        <Table
          aria-rowcount={virtual.range.active ? rows.length + (groupRow ? 2 : 1) : undefined}
          data-stacked-on-mobile={stacked || undefined}
          class={cn(stacked && STACKED_TABLE_CLASSES.table)}
        >
          <TableHeader class={cn(stacked && STACKED_TABLE_CLASSES.header)}>
            <TableRow class="hover:bg-transparent">
              {#if actionsBeforeCells}<TableHead rowspan={headerRowSpan} class="w-0"
                  >{t('actions', {}, 'Actions')}</TableHead
                >{/if}
              {#if reordering}<TableHead rowspan={headerRowSpan} class="w-16"
                  ><span class="sr-only">{t('table.reorder_start', {}, 'Reorder')}</span></TableHead
                >{/if}
              {#if selectable}
                <TableHead rowspan={headerRowSpan} class="w-10">
                  {#if !groupsOnlySelection}
                    <Checkbox
                      checked={pageSelection === true}
                      indeterminate={pageSelection === 'indeterminate'}
                      onCheckedChange={(checked) =>
                        checked ? selection.selectPage(records) : selection.deselectPage(records)}
                      aria-label={t('table.select_page', {}, 'Select page')}
                    />
                  {/if}
                </TableHead>
              {/if}
              {#if actionsBefore}<TableHead rowspan={headerRowSpan} class="w-0"
                  >{t('actions', {}, 'Actions')}</TableHead
                >{/if}
              {#if groupRow}
                {#each groupRow as cell (cell.key)}
                  {#if cell.group}
                    <TableHead
                      colspan={cell.span}
                      scope="colgroup"
                      {...extraProps(
                        cell.group.extraHeaderAttributes,
                        cn(
                          'border-b',
                          ALIGN[cell.group.alignment ?? 'center'],
                          cell.group.wrapHeader ? 'whitespace-normal' : undefined,
                        ),
                      )}>{cell.group.label}</TableHead
                    >
                  {:else if cell.column}
                    {@render columnHeader(cell.column, 2)}
                  {/if}
                {/each}
              {:else}
                {#each columns as column, columnIndex (uniqueKey(columns, columnIndex, (item) => item.name))}
                  {@render columnHeader(column)}
                {/each}
              {/if}
              {#if actionsAfter}<TableHead rowspan={headerRowSpan} class="w-0 text-end"
                  ><span class="sr-only">{t('actions', {}, 'Actions')}</span></TableHead
                >{/if}
            </TableRow>
            {#if groupRow}
              <TableRow class="hover:bg-transparent">
                {#each columns.filter( (column) => isGroupedColumn(column.name, table.columnGroups) ) as column (column.name)}
                  {@render columnHeader(column)}
                {/each}
              </TableRow>
            {/if}
          </TableHeader>
          <TableBody {@attach virtual.attach} class={cn(stacked && STACKED_TABLE_CLASSES.body)}>
            <VirtualSpacerRow height={virtual.range.before} colSpan={rowCells} />
            {#each visibleRows as { row, position } (row.kind === 'record' ? String(row.record.key) : `${row.kind}:${row.group.key}`)}
              {#if row.kind === 'group'}
                <GroupHeaderRow
                  group={row.group}
                  collapsed={row.collapsed}
                  collapsible={Boolean(table.grouping?.collapsible && !table.grouping.groupsOnly)}
                  colSpan={columns.length + leadingCells + trailingCells}
                  onToggle={() => groups.toggle(row.group.key)}
                  selection={groupsOnlySelection
                    ? {
                        checked: groupSelection(row.group.key),
                        onChange: (checked) =>
                          checked
                            ? selection.selectGroup(row.group.key, records)
                            : selection.deselectGroup(row.group.key, records),
                      }
                    : undefined}
                />
              {:else if row.kind === 'summary'}
                <SummaryRow
                  {columns}
                  values={row.summary}
                  leading={leadingCells}
                  trailing={trailingCells}
                />
              {:else}
                {@const record = row.record}
                {@const index = row.index}
                {@const clickable = !reordering && Boolean(record.url || table.recordAction)}
                {@const recordContext = { ...context, record: record.key }}
                {@const actionContext = {
                  ...recordContext,
                  arguments: selectedRecordsArguments(selectionState.current, record.actions),
                }}
                <TableRow
                  {@attach virtual.item}
                  data-index={position}
                  aria-rowindex={virtual.range.active ? position + (groupRow ? 3 : 2) : undefined}
                  data-state={isSelected(record.key) ? 'selected' : undefined}
                  draggable={reordering}
                  ondragstart={() => (dragKey = record.key)}
                  ondragover={(event) => event.preventDefault()}
                  ondrop={() => onDropRow(index)}
                  class={cn(
                    clickable && 'cursor-pointer',
                    table.striped && index % 2 === 1 && 'bg-muted/30',
                    stacked && STACKED_TABLE_CLASSES.row,
                    record.classes,
                  )}
                  onclick={() => clickable && rowClick(record)}
                >
                  {#if reordering}
                    <TableCell class="w-16 cursor-grab">
                      <div class="flex items-center">
                        <Icon
                          name="alfakit::tables.reorder.handle"
                          fallback={GripVerticalIcon}
                          class="text-muted-foreground size-4"
                          aria-hidden="true"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t('form.move_up', {}, 'Move up')}
                          disabled={index === 0}
                          onclick={() => moveRow(index, -1)}
                        >
                          <ChevronUpIcon />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t('form.move_down', {}, 'Move down')}
                          disabled={index === orderedRecords.length - 1}
                          onclick={() => moveRow(index, 1)}
                        >
                          <ChevronDownIcon />
                        </Button>
                      </div>
                    </TableCell>
                  {/if}
                  {#if actionsBeforeCells}
                    <TableCell
                      class={cn(stacked && STACKED_TABLE_CLASSES.actionsCell)}
                      onclick={(event) => event.stopPropagation()}
                    >
                      {#if record.actions}<ActionList
                          actions={record.actions}
                          context={actionContext}
                          size="sm"
                          align="end"
                          class="flex-nowrap"
                        />{/if}
                    </TableCell>
                  {/if}
                  {#if selectable}
                    <TableCell
                      class={cn(stacked && STACKED_TABLE_CLASSES.controlCell)}
                      onclick={(event) => event.stopPropagation()}
                    >
                      {#if record.selectable !== false}
                        <Checkbox
                          checked={isSelected(record.key)}
                          disabled={!canSelect(record.key)}
                          onCheckedChange={(checked) =>
                            selection.toggle(record.key, checked === true, record.group ?? '')}
                          aria-label={t('table.select_row', {}, 'Select row')}
                        />
                      {/if}
                    </TableCell>
                  {/if}
                  {#if actionsBefore}
                    <TableCell
                      class={cn(stacked && STACKED_TABLE_CLASSES.actionsCell)}
                      onclick={(event) => event.stopPropagation()}
                    >
                      {#if record.actions}<ActionList
                          actions={record.actions}
                          context={actionContext}
                          size="sm"
                          align="end"
                          class="flex-nowrap"
                        />{/if}
                    </TableCell>
                  {/if}
                  {#each columns as column, columnIndex (uniqueKey(columns, columnIndex, (item) => item.name))}
                    {@const cell = record.cells[column.name] ?? {}}
                    {@const clickDisabled = Boolean(cell.disabledClick)}
                    {#snippet content()}
                      <TableCellContent
                        {column}
                        {cell}
                        recordKey={record.key}
                        {token}
                        {component}
                      />
                    {/snippet}
                    <TableCell
                      title={cell.tooltip}
                      data-click-disabled={clickDisabled || undefined}
                      onclick={clickDisabled
                        ? (event: MouseEvent) => event.stopPropagation()
                        : undefined}
                      {...extraProps(
                        cell.extraAttributes,
                        cn(
                          clickDisabled && 'cursor-default',
                          ALIGN[column.alignment ?? 'start'],
                          column.verticalAlignment && VERTICAL_ALIGN[column.verticalAlignment],
                          (column as { wrap?: boolean }).wrap && 'whitespace-normal',
                          cell.hidden && 'invisible',
                          columnVisibilityClasses(column),
                          stacked && stackedCellClasses(column),
                        ),
                      )}
                    >
                      {#if stacked}
                        <span class={STACKED_TABLE_CLASSES.label} aria-hidden="true"
                          >{column.label}</span
                        >
                      {/if}
                      {#if clickDisabled}
                        <!-- `disabledClick()`: plain content that swallows the row click. -->
                        {@render content()}
                      {:else if cell.url && cell.openUrlInNewTab}
                        <a
                          href={cell.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="hover:underline"
                          onclick={(event) => event.stopPropagation()}
                          >{@render content()}<span class="sr-only">
                            {t('opens_in_new_tab', {}, '(opens in a new tab)')}</span
                          ></a
                        >
                      {:else if cell.url}
                        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                        <span class="contents" onclick={(event) => event.stopPropagation()}
                          ><Link href={cell.url} class="hover:underline">{@render content()}</Link
                          ></span
                        >
                      {:else if cell.action && record.actions}
                        <button
                          type="button"
                          class="text-start hover:underline"
                          onclick={(event) => {
                            event.stopPropagation()
                            const action = findAction(record, cell.action)

                            if (action) void runner.trigger(action, recordContext)
                          }}
                        >
                          {@render content()}
                        </button>
                      {:else if clickable && column.name === primaryColumn}
                        <!-- Keyboard path for a clickable row: its primary cell is a real link or button. -->
                        {#if table.recordAction || !record.url}
                          <button
                            type="button"
                            class="focus-visible:ring-ring/50 rounded-sm text-start outline-none focus-visible:ring-[3px]"
                            onclick={(event) => {
                              event.stopPropagation()
                              rowClick(record)
                            }}
                          >
                            {@render content()}
                          </button>
                        {:else if record.openUrlInNewTab}
                          <a
                            href={record.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-[3px]"
                            onclick={(event) => event.stopPropagation()}
                            >{@render content()}<span class="sr-only">
                              {t('opens_in_new_tab', {}, '(opens in a new tab)')}</span
                            ></a
                          >
                        {:else}
                          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                          <span class="contents" onclick={(event) => event.stopPropagation()}
                            ><Link
                              href={record.url}
                              class="focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-[3px]"
                              >{@render content()}</Link
                            ></span
                          >
                        {/if}
                      {:else}
                        {@render content()}
                      {/if}
                    </TableCell>
                  {/each}
                  {#if actionsAfter}
                    <TableCell
                      class={cn('text-end', stacked && STACKED_TABLE_CLASSES.actionsCell)}
                      onclick={(event) => event.stopPropagation()}
                    >
                      {#if record.actions}<ActionList
                          actions={record.actions}
                          context={actionContext}
                          size="sm"
                          align="end"
                          class="flex-nowrap"
                        />{/if}
                    </TableCell>
                  {/if}
                </TableRow>
              {/if}
            {/each}
            <VirtualSpacerRow height={virtual.range.after} colSpan={rowCells} />
          </TableBody>
          <TableSummaryFooter
            {table}
            {columns}
            leading={leadingCells}
            trailing={trailingCells}
            class={cn(stacked && STACKED_TABLE_CLASSES.footer)}
          />
        </Table>
      {/if}
    </div>
  {/snippet}

  {#snippet content()}
    {#if spreadsheetOpen}
      <SpreadsheetLazy {table} {token} {component} onClose={() => (spreadsheet = false)} />
    {:else}
      {@render surface()}
    {/if}
  {/snippet}

  <Slot name="table.content.before" scope={component} />
  {#if filtersAt === 'before' || filtersAt === 'after'}
    <!-- Sidebar filters: beside the table from `lg`, above it on smaller screens. -->
    <div data-slot="table-filters-layout" class="flex flex-col gap-4 lg:flex-row lg:items-start">
      {#if filtersAt === 'before'}<TableFilters {table} {component} />{/if}
      <div class="min-w-0 flex-1">{@render content()}</div>
      {#if filtersAt === 'after'}<TableFilters {table} {component} />{/if}
    </div>
  {:else}
    {@render content()}
  {/if}
  <Slot name="table.content.after" scope={component} />
  {#if filtersAt === 'below'}<TableFilters {table} {component} />{/if}
  <TablePagination {table} />
  <span aria-live="polite" aria-atomic="true" class="sr-only">{announcement}</span>
</div>
