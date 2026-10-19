import type {
  ActionContext,
  ActionSchema,
  ItemActionName,
  ItemActionSchema,
  SchemaComponent,
  TableColumnSchema,
} from '@alfakit/core'
import { resolveItemAction, tableColumnAlignmentClass, tableColumnCells } from '@alfakit/core'
import type { CSSProperties } from 'react'
import { useT } from '../../context'
import type { VirtualListBinding } from '../../hooks/use-virtual-list'
import { cn } from '../../lib/utils'
import { RenderComponent } from '../schema/schema-renderer'
import { VirtualSpacerRow } from '../schema/virtual-spacer'
import { ItemHeaderActions, useItemActionFallbacks } from './item-actions'

export interface RepeaterTableProps {
  id: string
  columns: TableColumnSchema[]
  /** The item state path prefix for an index (`lines.0.`). */
  prefixFor: (index: number) => string
  count: number
  schemaFor: (index: number) => SchemaComponent[]
  labelledBy?: string
  describedBy?: string
  reorderable: boolean
  cloneable: boolean
  deletable: boolean
  /** `compact()`: tighter cells. */
  compact?: boolean
  onMove: (from: number, to: number) => void
  onClone: (index: number) => void
  onRemove: (index: number) => void
  /** Windowed rows for long lists (see `useVirtualList`). */
  virtual: VirtualListBinding
  /** The field action context item actions run in. */
  context?: ActionContext
  /** The built-in action `name` of the row at `index` (null when hidden). */
  resolve?: (name: ItemActionName, index: number) => ItemActionSchema | null
  /** `extraItemActions()` of the row at `index`. */
  extraActionsFor?: (index: number) => ActionSchema[] | undefined
}

/**
 * A fixed `width()` (`9rem`, `120px`) is also the column's minimum, so the table scrolls
 * sideways instead of squeezing its fields; percentages stay flexible.
 */
function columnWidthStyle(width?: string | null): CSSProperties | undefined {
  if (!width) return undefined

  return width.trim().endsWith('%') ? { width } : { width, minWidth: width }
}

/** Header cells shared by the Repeater and RepeatableEntry tables. */
export function TableColumnHeaders({ columns }: { columns: TableColumnSchema[] }) {
  return (
    <>
      {columns.map((column, index) => (
        <th
          key={`${column.name ?? 'column'}-${index}`}
          scope="col"
          style={columnWidthStyle(column.width)}
          className={cn(
            'text-muted-foreground px-3 py-2 text-xs font-medium',
            tableColumnAlignmentClass(column),
            !column.wrapHeader && 'whitespace-nowrap',
          )}
        >
          <span className={cn(column.hiddenLabel && 'sr-only')}>{column.label}</span>
          {column.required && (
            <span className="text-destructive ms-0.5" aria-hidden="true">
              *
            </span>
          )}
        </th>
      ))}
    </>
  )
}

/**
 * Repeater items as table rows (`->table([...])`): one cell per item field, labels kept
 * for screen readers only, and the row controls in the last column.
 */
export function RepeaterTable({
  id,
  columns,
  prefixFor,
  count,
  schemaFor,
  labelledBy,
  describedBy,
  reorderable,
  cloneable,
  deletable,
  compact = false,
  onMove,
  onClone,
  onRemove,
  virtual: { range, indexes, attach, item },
  context = { token: '' },
  resolve,
  extraActionsFor,
}: RepeaterTableProps) {
  const t = useT()
  const fallbacks = useItemActionFallbacks()
  const resolveAction = (name: ItemActionName, index: number) =>
    resolve ? resolve(name, index) : resolveItemAction(name, {}, undefined, fallbacks[name])
  const hasExtraActions = Boolean(
    extraActionsFor && indexes.some((i) => extraActionsFor(i)?.length),
  )
  const hasControls = reorderable || cloneable || deletable || hasExtraActions
  const cellCount = columns.length + Number(hasControls)

  return (
    <div
      data-slot="repeater-table"
      data-compact={compact || undefined}
      className="bg-card relative overflow-x-auto rounded-lg border shadow-xs"
    >
      <table
        id={id}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-rowcount={range.active ? count + 1 : undefined}
        className="w-full border-collapse text-sm"
      >
        <thead className="bg-muted/40">
          <tr>
            <TableColumnHeaders columns={columns} />
            {hasControls && (
              <th scope="col" className="w-px px-2 py-2">
                <span className="sr-only">{t('actions', {}, 'Actions')}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody ref={attach}>
          <VirtualSpacerRow height={range.before} colSpan={cellCount} />
          {indexes.map((index) => {
            const cells = tableColumnCells(columns, schemaFor(index), prefixFor(index))

            return (
              <tr
                key={index}
                ref={item}
                data-index={index}
                aria-rowindex={range.active ? index + 2 : undefined}
                data-slot="repeater-row"
                className="border-t align-top"
              >
                {cells.map((cell, cellIndex) => (
                  <td
                    key={cell?.key ?? `empty-${cellIndex}`}
                    className={cn(
                      compact ? 'px-1.5 py-1' : 'px-3 py-2',
                      '[&_[data-slot=label]]:sr-only',
                      tableColumnAlignmentClass(columns[cellIndex] ?? {}),
                    )}
                  >
                    {cell && <RenderComponent component={cell} />}
                  </td>
                ))}
                {hasControls && (
                  <td className={compact ? 'px-1 py-1' : 'px-2 py-2'}>
                    <div className="flex items-center justify-end">
                      <ItemHeaderActions
                        context={context}
                        itemKey={String(index)}
                        index={index}
                        count={count}
                        resolve={(name) => resolveAction(name, index)}
                        extraActions={extraActionsFor?.(index)}
                        buttons={reorderable}
                        canClone={cloneable}
                        canDelete={deletable}
                        collapsible={false}
                        collapsed={false}
                        onMove={onMove}
                        onClone={() => onClone(index)}
                        onDelete={() => onRemove(index)}
                        onToggle={() => undefined}
                      />
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
          <VirtualSpacerRow height={range.after} colSpan={cellCount} />
        </tbody>
      </table>
    </div>
  )
}
