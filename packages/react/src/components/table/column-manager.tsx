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
import { ChevronDownIcon, ChevronUpIcon, Columns3Icon, GripVerticalIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useDirection, usePanel, useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { showToast } from '../notifications/flash-toasts'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet'
import { TableTriggerButton } from './trigger-button'

/**
 * The column manager: show / hide toggleable columns (kept in the query string) and,
 * with `reorderableColumns()`, move columns (stored per user on the server) by dragging a
 * row onto another or with the move up / down buttons (the keyboard path).
 *
 * `deferColumnManager()` keeps toggles in a draft until "Apply"; `columnManagerLayout()`
 * opens it in a dialog; `columnManagerColumns()` lays the list out in a grid.
 */
export function ColumnManager({
  table,
  token,
  component,
}: {
  table: TableSchema
  token: string
  component: string
}) {
  const t = useT()
  const panel = usePanel()
  const direction = useDirection()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  // Toggles of a deferred column manager wait here until "Apply".
  const [draft, setDraft] = useState<string[] | null>(null)
  // A moved column order: the draft of a deferred column manager, or shown at once
  // while it is saved.
  // It belongs to the columns it was made from: the server's next order replaces the
  // one shown while saving.
  const [orderState, setOrderState] = useState<{
    order: string[]
    columns: TableSchema['columns']
  } | null>(null)
  // Screen-reader announcement of the last move.
  const [announcement, setAnnouncement] = useState('')
  const idBase = useId()
  const reorderable = Boolean(table.reorderableColumns && panel.endpoints.tableColumns)
  const toggleable = Boolean(table.toggleableColumns)
  const deferred = Boolean(table.deferColumnManager)
  const orderDraft =
    orderState && (deferred || orderState.columns === table.columns) ? orderState.order : null
  const setOrderDraft = (order: string[] | null) =>
    setOrderState(order ? { order, columns: table.columns } : null)
  const appliedNames = table.columns.map((column) => column.name)
  const names = orderDraft ?? appliedNames
  const columns = orderColumnsBy(
    reorderable ? table.columns : table.columns.filter((column) => column.toggleable),
    orderDraft,
  )
  const visible = draft ?? table.visibleColumns

  if (!toggleable && !reorderable) return null

  const trigger = triggerButtonView(table, 'columnManager', {
    label: t('table.columns', {}, 'Columns'),
    showLabel: false,
  })

  if (!trigger) return null

  const toggle = (name: string) => {
    const next = toggleVisibleColumn(visible, name)

    if (deferred) {
      setDraft(next)
    } else {
      visitTable(table.identifier, { columns: next }, ['page'])
    }
  }

  const save = async (order: string[]): Promise<boolean> => {
    if (!panel.endpoints.tableColumns) return false

    setSaving(true)

    try {
      await saveColumnOrder(panel.endpoints.tableColumns, token, component, order)

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
      setSaving(false)
    }
  }

  const announce = (name: string, order: string[]) => {
    const { position, count, group } = columnManagerPosition(order, name, table.columnGroups)
    const label = table.columns.find((column) => column.name === name)?.label ?? name
    const replace = { column: label, position, count, group: group ?? '' }

    setAnnouncement(
      group
        ? deferred
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
        : deferred
          ? t(
              'table.column_manager.reordered_deferred',
              replace,
              `${label} moved to position ${position} of ${count}. Apply columns to save your changes.`,
            )
          : t(
              'table.column_manager.reordered',
              replace,
              `${label} moved to position ${position} of ${count}.`,
            ),
    )
  }

  // A new order: kept as a draft until "Apply" (`deferColumnManager()`), else saved now.
  const reorder = (name: string, order: string[]) => {
    if (saving || !columnOrderChanged(names, order)) return

    setOrderDraft(order)
    setAnnouncement('')

    if (deferred) {
      announce(name, order)

      return
    }

    void save(order).then((saved) => (saved ? announce(name, order) : setOrderDraft(null)))
  }

  const move = (name: string, offset: -1 | 1, button: HTMLElement) => {
    keepMoveButtonFocus(button)
    reorder(name, moveColumnInManager(names, name, offset, table.columnGroups))
  }

  const orderChanged = Boolean(orderDraft && columnOrderChanged(appliedNames, orderDraft))

  const apply = () => {
    if (orderDraft && orderChanged) void save(orderDraft)

    if (draft && columnDraftChanged(table.visibleColumns, draft)) {
      visitTable(table.identifier, { columns: draft }, ['page'])
    }

    setDraft(null)
    setOrderDraft(null)
    setAnnouncement('')
    setOpen(false)
  }

  // Reset: the defined column order and, for toggleable columns, the default visibility.
  const reset = () => {
    if (reorderable) {
      setOrderDraft(null)
      void save([])
    }

    if (toggleable) {
      setDraft(null)
      visitTable(table.identifier, { columns: defaultVisibleColumns(table) }, ['page'])
    }
  }

  const resetView = triggerButtonView(table, 'columnManagerReset', {
    label: toggleable
      ? t('table.reset_columns', {}, 'Reset')
      : t('table.reset_column_order', {}, 'Reset column order'),
    variant: 'ghost',
  })
  const applyView = deferred
    ? triggerButtonView(table, 'columnManagerApply', {
        label: t('table_filters.apply', {}, 'Apply'),
        variant: 'default',
      })
    : null
  const resetButton = resetView ? (
    <TableTriggerButton
      view={resetView}
      disabled={saving}
      data-slot="column-manager-reset"
      className={cn(!applyView && 'w-full')}
      onClick={reset}
    />
  ) : null
  const inHeader = table.columnManagerResetActionPosition === 'header'

  const list = (
    <ul
      className={cn(
        table.columnManagerColumns
          ? ['grid gap-0.5', gridColumnsClasses(table.columnManagerColumns)]
          : 'flex flex-col gap-0.5',
      )}
      aria-label={t('table.columns', {}, 'Columns')}
    >
      {columns.map((column) => {
        const { position, count, group } = columnManagerPosition(
          names,
          column.name,
          table.columnGroups,
        )
        const positionId = `${idBase}-${column.name}-position`

        return (
          <li
            key={column.name}
            data-column={column.name}
            draggable={reorderable && !saving}
            onDragStart={(event) => {
              if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
              setDragging(column.name)
            }}
            onDragOver={(event) => {
              if (dragging === null) return

              event.preventDefault()
              if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
              setDropTarget(column.name)
            }}
            onDragLeave={() => dropTarget === column.name && setDropTarget(null)}
            onDragEnd={() => {
              setDragging(null)
              setDropTarget(null)
            }}
            onDrop={(event) => {
              event.preventDefault()

              if (dragging !== null && dragging !== column.name) {
                reorder(dragging, moveColumnTo(names, dragging, column.name))
              }

              setDragging(null)
              setDropTarget(null)
            }}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1 text-sm',
              reorderable && 'cursor-grab',
              dragging === column.name && 'opacity-50',
              dropTarget === column.name && dragging !== column.name && 'bg-muted',
            )}
          >
            {reorderable && (
              <GripVerticalIcon
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden="true"
              />
            )}
            {column.toggleable ? (
              <label className="flex min-w-0 flex-1 items-center gap-2">
                <Checkbox
                  checked={visible.includes(column.name)}
                  onCheckedChange={() => toggle(column.name)}
                />
                <span className="truncate">{column.label}</span>
              </label>
            ) : (
              <span className="min-w-0 flex-1 truncate">{column.label}</span>
            )}
            {reorderable && (
              <span className="flex shrink-0 items-center">
                <span id={positionId} className="sr-only" data-slot="column-manager-position">
                  {group
                    ? t(
                        'table.column_manager.position_in_group',
                        { position, count, group },
                        `Position ${position} of ${count} in ${group}.`,
                      )
                    : t(
                        'table.column_manager.position',
                        { position, count },
                        `Position ${position} of ${count}.`,
                      )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={position <= 1}
                  aria-disabled={saving || undefined}
                  aria-describedby={positionId}
                  aria-label={t(
                    'table.move_column_up',
                    { column: column.label },
                    `Move ${column.label} up`,
                  )}
                  onClick={(event) => move(column.name, -1, event.currentTarget)}
                >
                  <ChevronUpIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={position >= count}
                  aria-disabled={saving || undefined}
                  aria-describedby={positionId}
                  aria-label={t(
                    'table.move_column_down',
                    { column: column.label },
                    `Move ${column.label} down`,
                  )}
                  onClick={(event) => move(column.name, 1, event.currentTarget)}
                >
                  <ChevronDownIcon />
                </Button>
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )

  const body: ReactNode = (
    <div className="flex flex-col gap-1">
      {inHeader && resetButton && <div className="flex justify-end">{resetButton}</div>}
      {list}
      {reorderable && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          data-slot="column-manager-announcement"
        >
          {announcement}
        </div>
      )}
      {((!inHeader && resetButton) || applyView) && (
        <div className="mt-1 flex items-center justify-end gap-2">
          {!inHeader && resetButton}
          {applyView && (
            <TableTriggerButton
              view={applyView}
              data-slot="column-manager-apply"
              disabled={
                !orderChanged && (!draft || !columnDraftChanged(table.visibleColumns, draft))
              }
              onClick={apply}
            />
          )}
        </div>
      )}
    </div>
  )

  const onOpenChange = (next: boolean) => {
    // Closing without "Apply" drops the draft.
    if (!next) {
      setDraft(null)
      if (deferred) setOrderDraft(null)
      setAnnouncement('')
    }
    setOpen(next)
  }

  const triggerButton = (
    <TableTriggerButton
      view={trigger}
      defaultIcon={<Icon name="alfakit::tables.actions.column-manager" fallback={Columns3Icon} />}
      aria-label={trigger.showLabel ? undefined : trigger.label}
    />
  )

  if (table.columnManagerLayout === 'modal') {
    // `columnManagerTriggerAction()` may set `slideOver()`, `modalWidth()` and the heading.
    const modal = table.triggerActions?.columnManager?.modal
    const heading = modal?.heading ?? t('table.columns', {}, 'Columns')
    const description = modal?.description ?? table.pluralModelLabel
    const widthClass = modal?.width ? FILTERS_MODAL_WIDTH_CLASSES[modal.width] : undefined

    if (modal?.slideOver) {
      return (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetTrigger asChild>{triggerButton}</SheetTrigger>
          <SheetContent
            side={slideOverSide(modal.slideOverPosition, direction)}
            className={cn('flex w-full flex-col gap-0 p-0', widthClass ?? 'sm:max-w-md')}
            data-slot="column-manager"
            data-slide-over=""
          >
            <SheetHeader className="border-b">
              <SheetTitle>{heading}</SheetTitle>
              <SheetDescription className={modal.description ? undefined : 'sr-only'}>
                {description}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4">{body}</div>
          </SheetContent>
        </Sheet>
      )
    }

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
        <DialogContent className={widthClass ?? 'sm:max-w-lg'} data-slot="column-manager">
          <DialogHeader>
            <DialogTitle>{heading}</DialogTitle>
            <DialogDescription className={modal?.description ? undefined : 'sr-only'}>
              {description}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">{body}</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        align="end"
        className={cn('p-2', table.columnManagerColumns ? 'w-auto min-w-64' : 'w-64')}
        data-slot="column-manager"
      >
        {body}
      </PopoverContent>
    </Popover>
  )
}
