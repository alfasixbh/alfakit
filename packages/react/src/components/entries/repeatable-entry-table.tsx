import type { SchemaComponent, TableColumnSchema } from '@alfakit/core'
import { tableColumnAlignmentClass, tableColumnCells } from '@alfakit/core'
import { cn } from '../../lib/utils'
import { TableColumnHeaders } from '../fields/repeater-table'
import { RenderComponent } from '../schema/schema-renderer'

/** RepeatableEntry items as table rows (`->table([...])`), entry labels for screen readers only. */
export function RepeatableEntryTable({
  columns,
  items,
}: {
  columns: TableColumnSchema[]
  items: SchemaComponent[][]
}) {
  return (
    <div
      data-slot="repeatable-entry-table"
      className="bg-card relative overflow-x-auto rounded-lg border shadow-xs"
    >
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/40">
          <tr>
            <TableColumnHeaders columns={columns} />
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-t align-top">
              {tableColumnCells(columns, item).map((cell, cellIndex) => (
                <td
                  key={cell?.key ?? `empty-${cellIndex}`}
                  className={cn(
                    'px-3 py-2 [&_[data-slot=entry-label]]:sr-only',
                    tableColumnAlignmentClass(columns[cellIndex] ?? {}),
                  )}
                >
                  {cell && (
                    <div className="contents">
                      <RenderComponent component={cell} />
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
