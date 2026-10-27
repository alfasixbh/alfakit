import type {
  ColumnSchema,
  ColumnSummariesSchema,
  SummaryValueSchema,
  TableSchema,
  TableSummaryRowSchema,
} from '@alfakit/core'
import { isolationDirection } from '@alfakit/core'
import { useFormatter, useT } from '../../context'
import { colorClass, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { TableCell, TableFooter, TableRow } from '../ui/table'

const ALIGN: Record<string, string> = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
  between: 'text-start',
  justify: 'text-justify',
}

export interface SummaryRowProps {
  columns: ColumnSchema[]
  values: ColumnSummariesSchema
  /** Shown in the leading cells, or above the first column's values. */
  label?: string
  /** Cells before the columns (selection, reorder handle, leading actions). */
  leading: number
  /** Cells after the columns (trailing actions). */
  trailing: number
  className?: string
}

/** `Count::icons()`: each icon with how often it occurs. */
function SummaryIcons({ icons }: { icons: NonNullable<SummaryValueSchema['icons']> }) {
  const format = useFormatter()

  if (icons.length === 0) {
    return <span className="font-medium">—</span>
  }

  return (
    <span data-slot="summary-icons" className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {icons.map((item, index) => (
        <span key={index} className="inline-flex items-center gap-1">
          <Icon
            name={item.icon}
            className={cn('size-4', colorClass(textColorClasses, item.color ?? undefined, 'gray'))}
          />
          <span className="font-medium tabular-nums">{format.number(item.count)}</span>
        </span>
      ))}
    </span>
  )
}

/** One row of column summaries (`data-slot="table-summary"`). */
export function SummaryRow({
  columns,
  values,
  label,
  leading,
  trailing,
  className,
}: SummaryRowProps) {
  const labelNode = label ? (
    <span className="text-muted-foreground text-xs font-medium">{label}</span>
  ) : null

  return (
    <TableRow data-slot="table-summary" className={cn('bg-muted/30 hover:bg-muted/30', className)}>
      {leading > 0 && <TableCell colSpan={leading}>{labelNode}</TableCell>}
      {columns.map((column, index) => (
        <TableCell
          key={column.name}
          className={cn('align-top', ALIGN[column.alignment ?? 'start'])}
        >
          <div className="flex flex-col gap-0.5">
            {leading === 0 && index === 0 && labelNode}
            {(values[column.name] ?? []).map((summary, position) => (
              <div key={position} className="flex flex-col">
                {summary.label && (
                  <span
                    className={cn(
                      'text-muted-foreground text-xs',
                      summary.hiddenLabel && 'sr-only',
                    )}
                  >
                    {summary.label}
                  </span>
                )}
                {summary.icons ? (
                  <SummaryIcons icons={summary.icons} />
                ) : (
                  <bdi dir={isolationDirection(summary.value)} className="font-medium tabular-nums">
                    {summary.value ?? '—'}
                  </bdi>
                )}
              </div>
            ))}
          </div>
        </TableCell>
      ))}
      {trailing > 0 && <TableCell colSpan={trailing} />}
    </TableRow>
  )
}

/** The page and "all records" summary rows below the table body. */
export function TableSummaryFooter({
  table,
  columns,
  leading,
  trailing,
  className,
}: {
  table: TableSchema
  columns: ColumnSchema[]
  leading: number
  trailing: number
  className?: string
}) {
  const t = useT()
  const rows = [table.summaries?.page, table.summaries?.all].filter(
    (row): row is TableSummaryRowSchema => Boolean(row),
  )

  // `deferTotals()`: one placeholder row until the summaries arrive.
  if (rows.length === 0 && table.deferredTotals?.summaries) {
    return (
      <TableFooter className={className}>
        <TableRow data-slot="table-summary" aria-busy="true">
          <TableCell colSpan={leading + columns.length + trailing}>
            <span
              aria-label={t('loading', {}, 'Loading')}
              className="bg-muted-foreground/20 block h-4 w-40 animate-pulse rounded-md"
            />
          </TableCell>
        </TableRow>
      </TableFooter>
    )
  }

  if (rows.length === 0) {
    return null
  }

  return (
    <TableFooter className={className}>
      {rows.map((row) => (
        <SummaryRow
          key={row.label}
          columns={columns}
          values={row.values}
          label={row.label}
          leading={leading}
          trailing={trailing}
        />
      ))}
    </TableFooter>
  )
}
