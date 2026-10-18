import type { ActionContext, ActionSchema, ColumnSchema, TableRecordSchema } from '@alfakit/core'
import { Link } from '@inertiajs/react'
import type { ReactNode } from 'react'
import { useActionRunner, useT } from '../../context'
import { TableCellContent } from './cells'

export interface RecordCellProps {
  column: ColumnSchema
  record: TableRecordSchema
  token: string
  component: string
  context: ActionContext
  /** The record opens a URL or runs the record action on click. */
  clickable: boolean
  /** This cell holds the clickable record's keyboard-focusable link or button. */
  primary: boolean
  /** Whether the record action (`recordAction()`) replaces the record URL. */
  hasRecordAction: boolean
  onRecordClick: (record: TableRecordSchema) => void
}

/** Find a record action by name, looking inside action groups. */
export function findRecordAction(
  record: TableRecordSchema,
  name: string | undefined,
): ActionSchema | undefined {
  if (!name) return undefined

  const action = record.actions
    ?.flatMap((item) => ('actions' in item ? item.actions : [item]))
    .find((item) => 'name' in item && item.name === name)

  return action && 'name' in action ? (action as ActionSchema) : undefined
}

/**
 * A record's cell content wrapped in its link: the column `url()`, the column `action()`,
 * or (for the primary cell of a clickable record) the record URL or record action. Shared
 * by table rows and content layouts.
 */
export function RecordCell({
  column,
  record,
  token,
  component,
  context,
  clickable,
  primary,
  hasRecordAction,
  onRecordClick,
}: RecordCellProps): ReactNode {
  const t = useT()
  const runner = useActionRunner()
  const cell = record.cells[column.name] ?? {}
  const content = (
    <TableCellContent
      column={column}
      cell={cell}
      recordKey={record.key}
      token={token}
      component={component}
    />
  )
  const newTabHint = (
    <span className="sr-only"> {t('opens_in_new_tab', {}, '(opens in a new tab)')}</span>
  )

  if (cell.url) {
    return cell.openUrlInNewTab ? (
      <a
        href={cell.url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {content}
        {newTabHint}
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
  }

  if (cell.action && record.actions) {
    return (
      <button
        type="button"
        className="text-start hover:underline"
        onClick={(event) => {
          event.stopPropagation()
          const action = findRecordAction(record, cell.action)

          if (action) void runner.trigger(action, { ...context, record: record.key })
        }}
      >
        {content}
      </button>
    )
  }

  if (!clickable || !primary) {
    return content
  }

  // Keyboard path for a clickable record: its primary cell is a real link or button (the
  // row itself stays a mouse convenience, not a tab stop).
  const focusRing = 'focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-[3px]'

  if (hasRecordAction || !record.url) {
    return (
      <button
        type="button"
        className={`${focusRing} text-start`}
        onClick={(event) => {
          event.stopPropagation()
          onRecordClick(record)
        }}
      >
        {content}
      </button>
    )
  }

  return record.openUrlInNewTab ? (
    <a
      href={record.url}
      target="_blank"
      rel="noopener noreferrer"
      className={focusRing}
      onClick={(event) => event.stopPropagation()}
    >
      {content}
      {newTabHint}
    </a>
  ) : (
    <Link href={record.url} className={focusRing} onClick={(event) => event.stopPropagation()}>
      {content}
    </Link>
  )
}
