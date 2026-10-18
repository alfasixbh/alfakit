import type { ActionContext, RecordKey, TableRecordSchema, TableSchema } from '@alfakit/core'
import {
  STACKED_TABLE_CLASSES,
  TableSelection,
  VIRTUAL_ESTIMATES,
  ariaSort,
  cachedTableTotals,
  canSelectAllRecords,
  columnGroupHeaderRow,
  columnVisibilityClasses,
  debounce,
  filtersPlacement,
  groupTableRows,
  isGroupedColumn,
  isTableLoading,
  loadTableTotals,
  mobileTable,
  moveListItem,
  pageFlash,
  pageSelectionState,
  paginationTotal,
  primaryColumnName,
  reorderTable,
  resolvePartialProps,
  selectedRecordsArguments,
  skeletonRowCount,
  stackedCellClasses,
  startTableReordering,
  stopTableReordering,
  tableLoadingStore,
  tableTotalsFailed,
  tableTotalsStore,
  triggerButtonView,
  virtualizeOptions,
  visitTable,
  withTableTotals,
} from '@alfakit/core'
import { Link, router } from '@inertiajs/react'
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  GripVerticalIcon,
  SearchIcon,
  Table2Icon,
  XIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  useActionRunner,
  useChoice,
  usePageSchema,
  usePanel,
  usePollComponent,
  useT,
} from '../../context'
import { useIsMobile } from '../../hooks/use-mobile'
import { useStore } from '../../hooks/use-store'
import { useVirtualList } from '../../hooks/use-virtual-list'
import { extraProps } from '../../lib/attributes'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { ActionList } from '../actions/action-list'
import { showToast } from '../notifications/flash-toasts'
import { Slot } from '../panel/slot'
import { LiveRecordsPill, useLiveUpdates } from '../realtime/live-records-pill'
import { VirtualSpacerRow } from '../schema/virtual-spacer'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'
import { Spinner } from '../ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { TableCellContent } from './cells'
import { ColumnManager } from './column-manager'
import { ContentLayout, ContentLayoutSort } from './content-layout'
import { FilterIndicators, TableFilters } from './filters'
import {
  GroupHeaderRow,
  TableGroupingMenu,
  useCollapsedGroups,
  useTablePersistence,
} from './grouping'
import { TablePagination } from './pagination'
import { Spreadsheet } from './spreadsheet-lazy'
import { SummaryRow, TableSummaryFooter } from './summary-rows'
import { TableViews } from './table-views'
import { TableTriggerButton } from './trigger-button'

export interface DataTableProps {
  table: TableSchema
  /** Context component (`table`, `relationManager:…`, `widget:…`). */
  component?: string
  token?: string
  className?: string
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

export function DataTable({
  table: serverTable,
  component = 'table',
  token: tokenProp,
  className,
}: DataTableProps) {
  const t = useT()
  const choice = useChoice()
  const panel = usePanel()
  const isMobile = useIsMobile()
  const page = usePageSchema()
  const runner = useActionRunner()
  const token = tokenProp ?? page?.token ?? ''
  // `deferTotals()`: the total and summaries load after the rows (placeholders meanwhile).
  const totalsVersion = useStore(tableTotalsStore)
  const totalsUrl = panel.endpoints.tableTotals

  useEffect(() => {
    void loadTableTotals(serverTable, { url: totalsUrl, token, component })
  }, [serverTable, totalsUrl, token, component, totalsVersion])

  const tableProp = useMemo(
    () =>
      withTableTotals(
        serverTable,
        cachedTableTotals(serverTable, component),
        tableTotalsFailed(serverTable, component),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the store version invalidates the cache read
    [serverTable, component, totalsVersion],
  )
  // Under the mobile preset a phone renders the rows as stacked cards; the server and
  // desktop markup keep the table.
  const table = useMemo(
    () =>
      mobileTable(
        tableProp,
        tableProp.columns.filter((column) => tableProp.visibleColumns.includes(column.name)),
        { isMobile, panel },
      ),
    [tableProp, isMobile, panel],
  )

  const context = useMemo<ActionContext>(() => ({ token, component }), [token, component])
  const selection = useMemo(() => new TableSelection(), [])
  const selectionState = useStore(selection.store)
  const [search, setSearch] = useState(table.search ?? '')
  // A reload in reorder mode (`?reordering=1`) comes back still reordering.
  const [reordering, setReordering] = useState(Boolean(table.reordering))
  const [order, setOrder] = useState<RecordKey[] | null>(null)
  const [dragKey, setDragKey] = useState<RecordKey | null>(null)
  // Live-region text announced after a keyboard move in reorder mode.
  const [announcement, setAnnouncement] = useState('')
  // `spreadsheet()`: the grid editing mode, toggled from the toolbar.
  const [spreadsheet, setSpreadsheet] = useState(false)
  const spreadsheetOpen = spreadsheet && Boolean(table.spreadsheet) && !reordering

  const records = table.records ?? []
  const columns = table.columns.filter((column) => table.visibleColumns.includes(column.name))
  const hasActions = records.some((record) => record.actions && record.actions.length > 0)
  const selectable = Boolean(table.selectable)
  const [collapsedGroups, toggleGroup] = useCollapsedGroups(table)
  // Cells around the columns, so group and summary rows line up with the records.
  const leadingCells =
    Number(table.recordActionsPosition === 'before-cells' && hasActions) +
    Number(reordering) +
    Number(selectable) +
    Number(table.recordActionsPosition === 'before-columns' && hasActions)
  const trailingCells = Number(
    (table.recordActionsPosition === 'after-columns' ||
      table.recordActionsPosition === 'after-cells') &&
      hasActions,
  )

  useTablePersistence(table)

  const [syncedSearch, setSyncedSearch] = useState(table.search)

  if (syncedSearch !== table.search) {
    setSyncedSearch(table.search)
    setSearch(table.search ?? '')
  }

  const pushSearch = useMemo(
    () =>
      debounce(
        (value: string) => visitTable(table.identifier, { search: value || null }, ['page']),
        table.searchDebounce,
      ),
    [table.identifier, table.searchDebounce],
  )

  // Polls refresh only this table (a partial reload of its own schema), share one request
  // with other components on the same interval and pause while the tab is hidden.
  const pollComponent = usePollComponent()

  useEffect(
    () => pollComponent(component, table.pollingInterval),
    [pollComponent, component, table.pollingInterval],
  )

  // `live()`: refresh in place when records change (broadcast), else poll as a fallback.
  const live = useLiveUpdates(table.live, component, {
    polling: Boolean(table.pollingInterval),
    records,
  })

  // A deferred table arrives without records: fetch them with a partial reload, which the
  // server always fills. Ask once per gap so a failing reload cannot loop.
  const awaitingRecords = Boolean(table.deferLoading) && !table.records
  const deferredRequested = useRef(false)

  useEffect(() => {
    if (!awaitingRecords) {
      deferredRequested.current = false
      return
    }

    if (deferredRequested.current) return

    deferredRequested.current = true
    router.reload({ only: resolvePartialProps(['page']) })
  }, [awaitingRecords])

  // `deselectAllRecordsWhenFiltered()`: new filters, search or tab clear the selection.
  useEffect(() => selection.syncScope(table.selectionScope), [selection, table.selectionScope])

  // `maxSelectableRecords()` / `selectGroupsOnly()`.
  selection.configure(table)

  // Clear selection after a bulk action completes.
  useEffect(() => {
    return router.on('success', (event) => {
      const flash = pageFlash(event.detail.page).alfakitAction

      if (flash?.deselectRecords) {
        selection.clear()
      }
    })
  }, [selection])

  // The column whose sort was just clicked shows a spinner until its records arrive.
  const [sortingColumn, setSortingColumn] = useState<string | null>(null)

  const sort = (column: string) => {
    const direction =
      table.sort?.column === column && table.sort.direction === 'asc' ? 'desc' : 'asc'
    setSortingColumn(column)
    visitTable(table.identifier, { sort: column, direction }, ['page'], {
      onFinish: () => setSortingColumn(null),
    })
  }

  const bulkContext = useMemo<ActionContext>(
    () => ({
      token,
      component,
      records: selectionState.allSelected ? [] : [...selectionState.selected],
      allRecords: selectionState.allSelected,
    }),
    [token, component, selectionState],
  )

  const orderedRecords = order
    ? order
        .map((key) => records.find((record) => String(record.key) === String(key)))
        .filter((record): record is TableRecordSchema => Boolean(record))
    : records

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
      setOrder(null)
      setReordering(false)
      stopTableReordering(table)
    }
  }

  // Keyboard alternative to drag-and-drop: the move up/down buttons in reorder mode.
  const moveRow = (index: number, offset: -1 | 1) => {
    const keys = orderedRecords.map((item) => item.key)
    const target = index + offset

    if (target < 0 || target >= keys.length) return

    setOrder(moveListItem(keys, index, target))
    setAnnouncement(
      t(
        'table.row_moved',
        { position: target + 1, total: keys.length },
        'Row moved to position :position of :total',
      ),
    )
  }

  const groupRow = columnGroupHeaderRow(columns, table.columnGroups)
  const headerRowSpan = groupRow ? 2 : undefined

  // Long pages render only the visible rows (plus a few around them); the spacer rows keep
  // the scroll height, `aria-rowcount` / `aria-rowindex` keep the real positions.
  const rows = groupTableRows(table, orderedRecords, collapsedGroups)
  const {
    range: rowWindow,
    indexes: positions,
    attach: attachBody,
    item: attachRow,
  } = useVirtualList(rows.length, virtualizeOptions(table.virtualize, VIRTUAL_ESTIMATES.row))
  const headerRows = groupRow ? 2 : 1
  const rowCells = columns.length + leadingCells + trailingCells

  // The column whose cell holds a clickable row's focusable link or button.
  const primaryColumn = primaryColumnName(columns)

  const rowClick = (record: TableRecordSchema) => {
    if (reordering) return

    if (table.recordAction) {
      const action = record.actions
        ?.flatMap((item) => ('actions' in item ? item.actions : [item]))
        .find((item) => 'name' in item && item.name === table.recordAction)

      if (action && 'name' in action) {
        void runner.trigger(action, { ...context, record: record.key })

        return
      }
    }

    if (record.url) {
      if (record.openUrlInNewTab) {
        window.open(record.url, '_blank', 'noopener')
      } else {
        router.visit(record.url)
      }
    }
  }

  // `reorderRecordsTriggerAction()`: one look per state.
  const reorderTrigger = triggerButtonView(
    table,
    reordering ? 'reorderRecordsActive' : 'reorderRecords',
    {
      label: reordering
        ? t('table.reorder_stop', {}, 'Done')
        : t('table.reorder_start', {}, 'Reorder'),
      variant: reordering ? 'default' : 'outline',
    },
  )
  const loadingState = useStore(tableLoadingStore)
  const showSkeleton =
    Boolean(table.loadingSkeleton) && isTableLoading(loadingState, table.identifier)

  const filtersAt = filtersPlacement(table.filtersLayout)
  const stacked = Boolean(table.stackedOnMobile)

  const toolbar = (
    <div className="flex flex-col gap-3">
      <Slot name="table.header.before" scope={component} />
      {(table.heading || table.description || table.headerActions?.length) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {table.heading && <h3 className="text-base font-semibold">{table.heading}</h3>}
            {table.description && (
              <p className="text-muted-foreground text-sm">{table.description}</p>
            )}
          </div>
          {table.headerActions && (
            <ActionList actions={table.headerActions} context={context} size="sm" />
          )}
        </div>
      )}
      <Slot name="table.header.after" scope={component} />
      <Slot name="table.toolbar.before" scope={component} />
      {table.views && <TableViews table={table} token={token} component={component} />}
      <div className="flex flex-wrap items-center gap-2">
        <Slot name="table.toolbar.search.before" scope={component} />
        {table.searchable && (
          <div className="relative min-w-48 flex-1 sm:max-w-xs">
            <Icon
              name="alfakit::tables.search-field"
              fallback={SearchIcon}
              className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
            />
            <Input
              type="search"
              value={search}
              placeholder={table.searchPlaceholder}
              onChange={(event) => {
                setSearch(event.target.value)

                if (!table.searchOnBlur) pushSearch(event.target.value)
              }}
              onBlur={() => table.searchOnBlur && pushSearch(search)}
              onKeyDown={(event) => event.key === 'Enter' && pushSearch.flush()}
              className="h-8 ps-8"
              aria-label={t('search', {}, 'Search')}
            />
            {search && (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground absolute end-2 top-1/2 -translate-y-1/2"
                aria-label={t('clear', {}, 'Clear')}
                onClick={() => {
                  setSearch('')
                  pushSearch('')
                  pushSearch.flush()
                }}
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        )}
        <Slot name="table.toolbar.search.after" scope={component} />
        <Slot name="table.toolbar.start" scope={component} />
        <span className="flex-1" />
        <Slot name="table.toolbar.end" scope={component} />
        <Slot name="table.toolbar.reorder-trigger.before" scope={component} />
        {table.reorderable && reorderTrigger && (
          <TableTriggerButton
            view={reorderTrigger}
            defaultIcon={
              <Icon name="alfakit::tables.actions.enable-reordering" fallback={GripVerticalIcon} />
            }
            aria-pressed={reordering}
            onClick={() => {
              if (reordering) {
                void finishReorder()

                return
              }

              // Pagination is off while reordering unless `paginatedWhileReordering()`.
              setReordering(true)
              startTableReordering(table)
            }}
          />
        )}
        <Slot name="table.toolbar.reorder-trigger.after" scope={component} />
        {table.spreadsheet && !reordering && (
          <Button
            type="button"
            variant={spreadsheetOpen ? 'default' : 'outline'}
            size="sm"
            data-slot="spreadsheet-trigger"
            aria-pressed={spreadsheetOpen}
            onClick={() => setSpreadsheet((open) => !open)}
            onMouseEnter={() => void Spreadsheet.preload()}
            onFocus={() => void Spreadsheet.preload()}
          >
            <Icon name="alfakit::tables.actions.spreadsheet" fallback={Table2Icon} />
            {t('table.spreadsheet.open', {}, 'Edit as spreadsheet')}
          </Button>
        )}
        {table.contentLayout && <ContentLayoutSort table={table} columns={columns} />}
        <Slot name="table.toolbar.grouping-selector.before" scope={component} />
        <TableGroupingMenu table={table} />
        <Slot name="table.toolbar.grouping-selector.after" scope={component} />
        {filtersAt === 'toolbar' && <TableFilters table={table} component={component} />}
        <Slot name="table.toolbar.column-manager-trigger.before" scope={component} />
        <ColumnManager table={table} token={token} component={component} />
        <Slot name="table.toolbar.column-manager-trigger.after" scope={component} />
      </div>
      <Slot name="table.toolbar.after" scope={component} />
      {filtersAt === 'above' && <TableFilters table={table} component={component} />}
      {!table.hiddenFilterIndicators && <FilterIndicators table={table} />}
      <Slot name="table.filter-indicators" scope={component} />
      {live && table.live?.newRecordsIndicator && <LiveRecordsPill live={live} />}
    </div>
  )

  // Simple, cursor and appending pagination don't count the records.
  const total = paginationTotal(table.pagination)
  const selectedCount = selectionState.allSelected
    ? (total ?? records.length)
    : selectionState.selected.size

  const bulkBar =
    selectable && selectedCount > 0 && table.bulkActions ? (
      <div className="bg-primary/5 border-primary/20 flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm">
        <span className="font-medium">
          {choice('table.selected', selectedCount, {}, ':count selected')}
        </span>
        <Slot name="table.selection-indicator.actions.before" scope={component} />
        {!selectionState.allSelected &&
          total !== null &&
          total > records.length &&
          canSelectAllRecords(table) && (
            <Button type="button" variant="link" size="sm" onClick={() => selection.selectAll()}>
              {t('table.select_all', {}, 'Select all')} ({total})
            </Button>
          )}
        <Button type="button" variant="link" size="sm" onClick={() => selection.clear()}>
          {t('table.deselect_all', {}, 'Deselect all')}
        </Button>
        <Slot name="table.selection-indicator.actions.after" scope={component} />
        {selection.isFull && (
          <span className="text-muted-foreground text-xs">
            {choice(
              'table.max_selected',
              table.maxSelectableRecords ?? 0,
              {},
              'You can select up to :count records',
            )}
          </span>
        )}
        <span className="flex-1" />
        <ActionList actions={table.bulkActions} context={bulkContext} size="sm" />
      </div>
    ) : null

  const columnHeader = (column: TableSchema['columns'][number], rowSpan?: number): ReactNode => {
    const active = table.sort?.column === column.name

    const label = column.sortable ? (
      <button
        type="button"
        className="hover:text-foreground inline-flex items-center gap-1"
        aria-busy={sortingColumn === column.name || undefined}
        onClick={() => sort(column.name)}
      >
        {column.label}
        {sortingColumn === column.name ? (
          <Spinner data-slot="table-sort-spinner" className="size-3.5" />
        ) : active ? (
          table.sort?.direction === 'asc' ? (
            <Icon
              name="alfakit::tables.header-cell.sort-asc-button"
              fallback={ArrowUpIcon}
              className="size-3.5"
              aria-hidden="true"
            />
          ) : (
            <Icon
              name="alfakit::tables.header-cell.sort-desc-button"
              fallback={ArrowDownIcon}
              className="size-3.5"
              aria-hidden="true"
            />
          )
        ) : (
          <Icon
            name="alfakit::tables.header-cell.sort-button"
            fallback={ArrowUpDownIcon}
            className="size-3.5 opacity-40"
            aria-hidden="true"
          />
        )}
      </button>
    ) : (
      column.label
    )

    return (
      <TableHead
        key={column.name}
        rowSpan={rowSpan}
        aria-sort={
          column.sortable
            ? ariaSort(column.name, table.sort?.column, table.sort?.direction)
            : undefined
        }
        style={column.width ? { width: column.width } : undefined}
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
        <div className="flex flex-col gap-1">
          {column.headerTooltip ? (
            <span title={column.headerTooltip} data-slot="header-tooltip">
              {label}
              <span className="sr-only"> ({column.headerTooltip})</span>
            </span>
          ) : (
            label
          )}
          <Slot name="table.header-cell" scope={component} data={{ column: column.name }} />
          {column.searchable && (
            <Input
              type="search"
              defaultValue={table.columnSearches?.[column.name] ?? ''}
              placeholder={t('search', {}, 'Search')}
              aria-label={`${t('search', {}, 'Search')} ${column.label}`}
              className="h-7 text-xs font-normal"
              onKeyDown={(event) =>
                event.key === 'Enter' &&
                visitTable(
                  table.identifier,
                  {
                    columnSearch: {
                      ...(table.columnSearches ?? {}),
                      [column.name]: (event.target as HTMLInputElement).value,
                    },
                  },
                  ['page'],
                )
              }
            />
          )}
        </div>
      </TableHead>
    )
  }

  const groupsOnlySelection = selectable && Boolean(table.selectGroupsOnly)

  const content = (
    <div
      data-surface="table"
      aria-busy={showSkeleton || undefined}
      className="bg-card relative overflow-hidden rounded-xl border shadow-xs"
    >
      {showSkeleton && (
        <div
          data-slot="table-loading-skeleton"
          aria-hidden="true"
          className="bg-card/80 absolute inset-0 z-10 flex flex-col gap-3 p-4"
        >
          {Array.from({ length: skeletonRowCount(records) }, (_, index) => (
            <div key={index} className="bg-muted h-6 animate-pulse rounded-md" />
          ))}
        </div>
      )}
      {awaitingRecords ? (
        <div className="text-muted-foreground p-8 text-center text-sm">
          {t('loading', {}, 'Loading…')}
        </div>
      ) : records.length === 0 && !(table.grouping?.groupsOnly && table.recordGroups?.length) ? (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
            <Icon name={table.emptyState.icon} className="size-6" />
          </div>
          <div>
            <p className="font-medium">{table.emptyState.heading}</p>
            {table.emptyState.description && (
              <p className="text-muted-foreground text-sm">{table.emptyState.description}</p>
            )}
          </div>
          {table.emptyState.actions && (
            <ActionList actions={table.emptyState.actions} context={context} size="sm" />
          )}
        </div>
      ) : table.contentLayout ? (
        <ContentLayout
          table={table}
          records={records}
          columns={columns}
          token={token}
          component={component}
          context={context}
          selectable={selectable}
          selection={selection}
          onRecordClick={rowClick}
        />
      ) : (
        <Table
          aria-rowcount={rowWindow.active ? rows.length + headerRows : undefined}
          data-stacked-on-mobile={stacked || undefined}
          className={cn(stacked && STACKED_TABLE_CLASSES.table)}
        >
          <TableHeader className={cn(stacked && STACKED_TABLE_CLASSES.header)}>
            {/* With column groups, the leading / trailing cells and ungrouped columns span
                  both header rows; grouped columns get their own header in the second row. */}
            <TableRow className="hover:bg-transparent">
              {table.recordActionsPosition === 'before-cells' && hasActions && (
                <TableHead rowSpan={headerRowSpan} className="w-0">
                  {t('actions', {}, 'Actions')}
                </TableHead>
              )}
              {reordering && (
                <TableHead rowSpan={headerRowSpan} className="w-16">
                  <span className="sr-only">{t('table.reorder_start', {}, 'Reorder')}</span>
                </TableHead>
              )}
              {selectable && (
                <TableHead rowSpan={headerRowSpan} className="w-10">
                  {!groupsOnlySelection && (
                    <Checkbox
                      checked={pageSelectionState(selection, records)}
                      onCheckedChange={(checked) =>
                        checked === true
                          ? selection.selectPage(records)
                          : selection.deselectPage(records)
                      }
                      aria-label={t('table.select_page', {}, 'Select page')}
                    />
                  )}
                </TableHead>
              )}
              {table.recordActionsPosition === 'before-columns' && hasActions && (
                <TableHead rowSpan={headerRowSpan} className="w-0">
                  {t('actions', {}, 'Actions')}
                </TableHead>
              )}
              {groupRow
                ? groupRow.map((cell) =>
                    cell.group ? (
                      <TableHead
                        key={cell.key}
                        colSpan={cell.span}
                        scope="colgroup"
                        {...extraProps(
                          cell.group.extraHeaderAttributes,
                          cn(
                            'border-b',
                            ALIGN[cell.group.alignment ?? 'center'],
                            cell.group.wrapHeader ? 'whitespace-normal' : undefined,
                          ),
                        )}
                      >
                        {cell.group.label}
                      </TableHead>
                    ) : cell.column ? (
                      columnHeader(cell.column, 2)
                    ) : null,
                  )
                : columns.map((column) => columnHeader(column))}
              {(table.recordActionsPosition === 'after-columns' ||
                table.recordActionsPosition === 'after-cells') &&
                hasActions && (
                  <TableHead rowSpan={headerRowSpan} className="w-0 text-end">
                    <span className="sr-only">{t('actions', {}, 'Actions')}</span>
                  </TableHead>
                )}
            </TableRow>
            {groupRow && (
              <TableRow className="hover:bg-transparent">
                {columns
                  .filter((column) => isGroupedColumn(column.name, table.columnGroups))
                  .map((column) => columnHeader(column))}
              </TableRow>
            )}
          </TableHeader>
          <TableBody ref={attachBody} className={cn(stacked && STACKED_TABLE_CLASSES.body)}>
            <VirtualSpacerRow height={rowWindow.before} colSpan={rowCells} />
            {positions.map((position) => {
              const row = rows[position] as (typeof rows)[number]

              if (row.kind === 'group') {
                return (
                  <GroupHeaderRow
                    key={`group:${row.group.key}`}
                    group={row.group}
                    collapsed={row.collapsed}
                    collapsible={Boolean(table.grouping?.collapsible && !table.grouping.groupsOnly)}
                    colSpan={columns.length + leadingCells + trailingCells}
                    onToggle={() => toggleGroup(row.group.key)}
                    selection={
                      groupsOnlySelection
                        ? {
                            checked: selection.groupState(row.group.key, records),
                            onChange: (checked) =>
                              checked
                                ? selection.selectGroup(row.group.key, records)
                                : selection.deselectGroup(row.group.key, records),
                          }
                        : undefined
                    }
                  />
                )
              }

              if (row.kind === 'summary') {
                return (
                  <SummaryRow
                    key={`summary:${row.group.key}`}
                    columns={columns}
                    values={row.summary}
                    leading={leadingCells}
                    trailing={trailingCells}
                  />
                )
              }

              const { record, index } = row
              const clickable = !reordering && Boolean(record.url || table.recordAction)
              const actions = record.actions ? (
                <ActionList
                  actions={record.actions}
                  context={{
                    ...context,
                    record: record.key,
                    arguments: selectedRecordsArguments(selectionState, record.actions),
                  }}
                  size="sm"
                  align="end"
                  className="flex-nowrap"
                />
              ) : null

              return (
                <TableRow
                  key={String(record.key)}
                  ref={attachRow}
                  data-index={position}
                  aria-rowindex={rowWindow.active ? position + headerRows + 1 : undefined}
                  data-state={selection.isSelected(record.key) ? 'selected' : undefined}
                  draggable={reordering}
                  onDragStart={() => setDragKey(record.key)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragKey === null) return

                    const keys = orderedRecords.map((item) => item.key)
                    const from = keys.findIndex((key) => String(key) === String(dragKey))
                    const [moved] = keys.splice(from, 1)

                    if (moved !== undefined) keys.splice(index, 0, moved)

                    setOrder(keys)
                    setDragKey(null)
                  }}
                  className={cn(
                    clickable && 'cursor-pointer',
                    table.striped && index % 2 === 1 && 'bg-muted/30',
                    stacked && STACKED_TABLE_CLASSES.row,
                    record.classes,
                  )}
                  onClick={() => clickable && rowClick(record)}
                >
                  {reordering && (
                    <TableCell className="w-16 cursor-grab">
                      <div className="flex items-center">
                        <Icon
                          name="alfakit::tables.reorder.handle"
                          fallback={GripVerticalIcon}
                          className="text-muted-foreground size-4"
                          aria-hidden="true"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t('form.move_up', {}, 'Move up')}
                          disabled={index === 0}
                          onClick={() => moveRow(index, -1)}
                        >
                          <ChevronUpIcon />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t('form.move_down', {}, 'Move down')}
                          disabled={index === orderedRecords.length - 1}
                          onClick={() => moveRow(index, 1)}
                        >
                          <ChevronDownIcon />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                  {table.recordActionsPosition === 'before-cells' && hasActions && (
                    <TableCell
                      className={cn(stacked && STACKED_TABLE_CLASSES.actionsCell)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {actions}
                    </TableCell>
                  )}
                  {selectable && (
                    <TableCell
                      className={cn(stacked && STACKED_TABLE_CLASSES.controlCell)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {record.selectable !== false && (
                        <Checkbox
                          checked={selection.isSelected(record.key)}
                          disabled={!selection.canSelect(record.key)}
                          onCheckedChange={(checked) =>
                            selection.toggle(record.key, checked === true, record.group ?? '')
                          }
                          aria-label={t('table.select_row', {}, 'Select row')}
                        />
                      )}
                    </TableCell>
                  )}
                  {table.recordActionsPosition === 'before-columns' && hasActions && (
                    <TableCell
                      className={cn(stacked && STACKED_TABLE_CLASSES.actionsCell)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {actions}
                    </TableCell>
                  )}
                  {columns.map((column) => {
                    const cell = record.cells[column.name] ?? {}
                    // `disabledClick()`: the cell is plain content and swallows the row click.
                    const clickDisabled = Boolean(cell.disabledClick)
                    const content = (
                      <TableCellContent
                        column={column}
                        cell={cell}
                        recordKey={record.key}
                        token={token}
                        component={component}
                      />
                    )
                    const wrapped = clickDisabled ? (
                      content
                    ) : cell.url ? (
                      cell.openUrlInNewTab ? (
                        <a
                          href={cell.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {content}
                          <span className="sr-only">
                            {' '}
                            {t('opens_in_new_tab', {}, '(opens in a new tab)')}
                          </span>
                        </a>
                      ) : (
                        <Link
                          href={cell.url}
                          className="hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {content}
                        </Link>
                      )
                    ) : cell.action && record.actions ? (
                      <button
                        type="button"
                        className="text-start hover:underline"
                        onClick={(event) => {
                          event.stopPropagation()
                          const action = record.actions
                            ?.flatMap((item) => ('actions' in item ? item.actions : [item]))
                            .find((item) => 'name' in item && item.name === cell.action)

                          if (action && 'name' in action)
                            void runner.trigger(action, { ...context, record: record.key })
                        }}
                      >
                        {content}
                      </button>
                    ) : clickable && column.name === primaryColumn ? (
                      // Keyboard path for a clickable row: its primary cell is a real link or
                      // button (the row itself stays a mouse convenience, not a tab stop).
                      table.recordAction || !record.url ? (
                        <button
                          type="button"
                          className="focus-visible:ring-ring/50 rounded-sm text-start outline-none focus-visible:ring-[3px]"
                          onClick={(event) => {
                            event.stopPropagation()
                            rowClick(record)
                          }}
                        >
                          {content}
                        </button>
                      ) : record.openUrlInNewTab ? (
                        <a
                          href={record.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-[3px]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {content}
                          <span className="sr-only">
                            {' '}
                            {t('opens_in_new_tab', {}, '(opens in a new tab)')}
                          </span>
                        </a>
                      ) : (
                        <Link
                          href={record.url}
                          className="focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-[3px]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {content}
                        </Link>
                      )
                    ) : (
                      content
                    )

                    return (
                      <TableCell
                        key={column.name}

                        title={cell.tooltip}
                        data-click-disabled={clickDisabled || undefined}
                        onClick={clickDisabled ? (event) => event.stopPropagation() : undefined}
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
                        {stacked && (
                          <span className={STACKED_TABLE_CLASSES.label} aria-hidden="true">
                            {column.label}
                          </span>
                        )}
                        {wrapped}
                      </TableCell>
                    )
                  })}
                  {(table.recordActionsPosition === 'after-columns' ||
                    table.recordActionsPosition === 'after-cells') &&
                    hasActions && (
                      <TableCell
                        className={cn('text-end', stacked && STACKED_TABLE_CLASSES.actionsCell)}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {actions}
                      </TableCell>
                    )}
                </TableRow>
              )
            })}
            <VirtualSpacerRow height={rowWindow.after} colSpan={rowCells} />
          </TableBody>
          <TableSummaryFooter
            table={table}
            columns={columns}
            leading={leadingCells}
            trailing={trailingCells}
            className={cn(stacked && STACKED_TABLE_CLASSES.footer)}
          />
        </Table>
      )}
    </div>
  )

  const surface = spreadsheetOpen ? (
    <Spreadsheet
      table={table}
      token={token}
      component={component}
      onClose={() => setSpreadsheet(false)}
    />
  ) : (
    content
  )

  return (
    <div data-slot="table-block" className={cn('flex flex-col gap-4', className)}>
      {toolbar}
      {bulkBar}
      <Slot name="table.content.before" scope={component} />
      {filtersAt === 'before' || filtersAt === 'after' ? (
        // Sidebar filters: beside the table from `lg`, above it on smaller screens.
        <div
          data-slot="table-filters-layout"
          className="flex flex-col gap-4 lg:flex-row lg:items-start"
        >
          {filtersAt === 'before' && <TableFilters table={table} component={component} />}
          <div className="min-w-0 flex-1">{surface}</div>
          {filtersAt === 'after' && <TableFilters table={table} component={component} />}
        </div>
      ) : (
        surface
      )}
      <Slot name="table.content.after" scope={component} />
      {filtersAt === 'below' && <TableFilters table={table} component={component} />}
      <TablePagination table={table} />
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </span>
    </div>
  )
}
