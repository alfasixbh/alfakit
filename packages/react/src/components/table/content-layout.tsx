import type {
  ActionContext,
  ColumnLayoutNode,
  ColumnSchema,
  TableRecordSchema,
  TableSchema,
  TableSelection,
} from '@alfakit/core'
import {
  VIRTUAL_ESTIMATES,
  columnSpanClasses,
  columnStartClasses,
  columnVisibilityClasses,
  gridColumnsClasses,
  layoutNodeGrows,
  layoutVisibilityClasses,
  primaryColumnName,
  recordActionsAtStart,
  splitClasses,
  stackClasses,
  virtualizeOptions,
  visitTable,
} from '@alfakit/core'
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useT } from '../../context'
import { useVirtualList } from '../../hooks/use-virtual-list'
import { extraProps } from '../../lib/attributes'
import { cn } from '../../lib/utils'
import { ActionList } from '../actions/action-list'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { RecordCell } from './record-cell'

export interface ContentLayoutProps {
  table: TableSchema
  records: TableRecordSchema[]
  columns: ColumnSchema[]
  token: string
  component: string
  context: ActionContext
  selectable: boolean
  selection: TableSelection
  onRecordClick: (record: TableRecordSchema) => void
}

function hasCollapsiblePanel(nodes: ColumnLayoutNode[]): boolean {
  return nodes.some(
    (node) =>
      node.type !== 'Column' &&
      ((node.type === 'Panel' && Boolean(node.collapsible)) || hasCollapsiblePanel(node.schema)),
  )
}

/**
 * Records arranged by a content layout (`Split`, `Stack`, `Panel`, `Grid`) instead of
 * a row of cells, optionally as cards in a `contentGrid()`. Long pages render only the
 * records in view (plus a few around them), by whole rows of the card grid; the list
 * keeps `aria-setsize` / `aria-posinset` so assistive technology knows the real positions.
 */
export function ContentLayout(props: ContentLayoutProps) {
  const { table, records } = props
  const grid = table.contentGrid
  const { range, indexes, style, attach, item } = useVirtualList(
    records.length,
    virtualizeOptions(table.virtualize, VIRTUAL_ESTIMATES.item, grid ? 16 : 0, grid ? 'auto' : 1),
  )

  return (
    <div
      data-slot="table-content"
      role={range.active ? 'list' : undefined}
      ref={attach}
      style={style}
      className={cn(grid ? cn('grid gap-4 p-4', gridColumnsClasses(grid)) : 'divide-y')}
    >
      {indexes.map((index) => {
        const record = records[index] as TableRecordSchema

        return (
          <ContentRecord
            key={String(record.key)}
            {...props}
            record={record}
            card={Boolean(grid)}
            index={index}
            position={range.active ? { size: records.length, item } : undefined}
          />
        )
      })}
    </div>
  )
}

function ContentRecord({
  table,
  record,
  columns,
  token,
  component,
  context,
  selectable,
  selection,
  onRecordClick,
  card,
  index,
  position,
}: ContentLayoutProps & {
  record: TableRecordSchema
  card: boolean
  index: number
  /** Set while the list is windowed: the real list size and the item ref callback. */
  position?: { size: number; item: (element: HTMLElement | null) => void | (() => void) }
}) {
  const t = useT()
  const panelId = useId()
  const layout = table.contentLayout ?? []
  const collapsible = hasCollapsiblePanel(layout)
  const startsCollapsed = !layout.some(
    (node) => node.type === 'Panel' && node.collapsible && !node.collapsed,
  )
  const [open, setOpen] = useState(!startsCollapsed)
  const clickable = Boolean(record.url || table.recordAction)
  const primary = primaryColumnName(columns)
  const visible = new Set(columns.map((column) => column.name))
  const selected = selection.isSelected(record.key)

  const renderNode = (node: ColumnLayoutNode, index: number, inSplit = false): ReactNode => {
    const grows = inSplit && layoutNodeGrows(node, columns)
    const sizing = inSplit ? (grows ? 'min-w-0 flex-1' : 'shrink-0') : undefined
    // `columnSpan()` / `columnStart()` of a column or layout inside a `Grid`.
    const span = cn(columnSpanClasses(node.columnSpan), columnStartClasses(node.columnStart))

    if (node.type === 'Column') {
      const column = columns.find((item) => item.name === node.name)

      if (!column || !visible.has(column.name)) return null

      return (
        <div
          key={`column:${column.name}`}
          data-column={column.name}
          className={cn(sizing, span, columnVisibilityClasses(column, 'block'))}
        >
          <RecordCell
            column={column}
            record={record}
            token={token}
            component={component}
            context={context}
            clickable={clickable}
            primary={column.name === primary}
            hasRecordAction={Boolean(table.recordAction)}
            onRecordClick={onRecordClick}
          />
        </div>
      )
    }

    const visibility = layoutVisibilityClasses(node)
    const key = `${node.type}:${index}`

    switch (node.type) {
      case 'Split':
        return (
          <div
            key={key}
            data-layout="split"
            {...extraProps(node.extraAttributes, cn(splitClasses(node), visibility, sizing, span))}
          >
            {node.schema.map((child, childIndex) => renderNode(child, childIndex, true))}
          </div>
        )
      case 'Stack':
        return (
          <div
            key={key}
            data-layout="stack"
            {...extraProps(node.extraAttributes, cn(stackClasses(node), visibility, sizing, span))}
          >
            {node.schema.map((child, childIndex) => renderNode(child, childIndex))}
          </div>
        )
      case 'Grid':
        return (
          <div
            key={key}
            data-layout="grid"
            {...extraProps(
              node.extraAttributes,
              cn('grid gap-2', gridColumnsClasses(node.columns), visibility, sizing, span),
            )}
          >
            {node.schema.map((child, childIndex) => renderNode(child, childIndex))}
          </div>
        )
      case 'Panel':
        if (node.collapsible && !open) return null

        return (
          <div
            key={key}
            data-layout="panel"
            {...extraProps(
              node.extraAttributes,
              cn('bg-muted/50 flex flex-col gap-2 rounded-lg p-3', visibility, sizing, span),
            )}
          >
            {node.schema.map((child, childIndex) => renderNode(child, childIndex))}
          </div>
        )
      default:
        return null
    }
  }

  // Collapsible panels at the top level go under the record's main row.
  const main = layout.filter((node) => !(node.type === 'Panel' && node.collapsible))
  const details = layout.filter((node) => node.type === 'Panel' && node.collapsible)
  const atStart = recordActionsAtStart(table.recordActionsPosition)
  const actions = record.actions?.length ? (
    <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
      <ActionList
        actions={record.actions}
        context={{ ...context, record: record.key }}
        size="sm"
        align="end"
        className="flex-nowrap"
      />
    </div>
  ) : null

  return (
    <div
      data-slot="table-record"
      data-state={selected ? 'selected' : undefined}
      data-index={index}
      ref={position?.item}
      role={position ? 'listitem' : undefined}
      aria-setsize={position?.size}
      aria-posinset={position ? index + 1 : undefined}
      className={cn(
        'flex flex-col gap-3 p-4',
        card && 'bg-card rounded-lg border shadow-xs',
        clickable && 'hover:bg-muted/40 cursor-pointer',
        selected && 'bg-muted/60',
        record.classes,
      )}
      onClick={() => clickable && onRecordClick(record)}
    >
      <div className="flex items-start gap-3">
        {atStart && table.recordActionsPosition === 'before-cells' && actions}
        {selectable && (
          <div className="pt-0.5" onClick={(event) => event.stopPropagation()}>
            {record.selectable !== false && (
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => selection.toggle(record.key, checked === true)}
                aria-label={t('table.select_row', {}, 'Select row')}
              />
            )}
          </div>
        )}
        {atStart && table.recordActionsPosition === 'before-columns' && actions}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {main.map((node, index) => renderNode(node, index))}
        </div>
        {!atStart && actions}
        {collapsible && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-expanded={open}
            aria-controls={open ? panelId : undefined}
            aria-label={
              open
                ? t('table.hide_details', {}, 'Hide details')
                : t('table.show_details', {}, 'Show details')
            }
            onClick={(event) => {
              event.stopPropagation()
              setOpen(!open)
            }}
          >
            <ChevronDownIcon className={cn('transition-transform', open && 'rotate-180')} />
          </Button>
        )}
      </div>
      {open && details.length > 0 && (
        <div id={panelId} className="flex flex-col gap-3">
          {details.map((node, index) => renderNode(node, main.length + index))}
        </div>
      )}
    </div>
  )
}

/**
 * Sorting for content layouts, which have no column headers: a select of the sortable
 * columns and a direction toggle.
 */
export function ContentLayoutSort({
  table,
  columns,
}: {
  table: TableSchema
  columns: ColumnSchema[]
}) {
  const t = useT()
  const sortable = columns.filter((column) => column.sortable)

  if (sortable.length === 0) return null

  const direction = table.sort?.direction ?? 'asc'
  // A default sort on a column the select doesn't list (`created_at`) shows the placeholder.
  const selected = sortable.some((column) => column.name === table.sort?.column)
    ? (table.sort?.column ?? '')
    : ''

  return (
    <div className="flex items-center gap-1">
      <label className="flex items-center gap-2 text-sm">
        <span className="sr-only">{t('table.sort_by', {}, 'Sort by')}</span>
        <select
          value={selected}
          onChange={(event) =>
            visitTable(
              table.identifier,
              {
                sort: event.target.value || null,
                direction: event.target.value ? direction : null,
              },
              ['page'],
            )
          }
          className="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
        >
          <option value="">
            {table.defaultSortOptionLabel ?? t('table.sort_by', {}, 'Sort by')}
          </option>
          {sortable.map((column) => (
            <option key={column.name} value={column.name}>
              {column.label}
            </option>
          ))}
        </select>
      </label>
      {table.sort && (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={
            direction === 'asc'
              ? t('table.sort_ascending', {}, 'Ascending')
              : t('table.sort_descending', {}, 'Descending')
          }
          onClick={() =>
            visitTable(
              table.identifier,
              { sort: table.sort?.column ?? null, direction: direction === 'asc' ? 'desc' : 'asc' },
              ['page'],
            )
          }
        >
          {direction === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />}
        </Button>
      )}
    </div>
  )
}
