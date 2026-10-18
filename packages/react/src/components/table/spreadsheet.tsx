import type {
  PastePlan,
  SpreadsheetAnnouncement,
  SpreadsheetSaveResult,
  TableSchema,
} from '@alfakit/core'
import {
  SPREADSHEET_CLASSES,
  SPREADSHEET_ISSUE_MESSAGES,
  SpreadsheetGrid,
  VIRTUAL_ESTIMATES,
  inertiaReload,
  saveSpreadsheetChanges,
  spreadsheetAnnouncement,
  spreadsheetAria,
  spreadsheetCellClass,
  spreadsheetCellId,
  spreadsheetColumns,
  spreadsheetRows,
  spreadsheetSelectionSize,
  virtualizeOptions,
} from '@alfakit/core'
import { CheckIcon } from 'lucide-react'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'
import { useChoice, useDirection, usePanel, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { useVirtualList } from '../../hooks/use-virtual-list'
import { showToast } from '../notifications/flash-toasts'
import { VirtualSpacerRow } from '../schema/virtual-spacer'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Spinner } from '../ui/spinner'

export interface SpreadsheetProps {
  table: TableSchema
  token: string
  component: string
  /** Leave spreadsheet mode. */
  onClose: () => void
}

interface PastePreview {
  plan: PastePlan
  errors: SpreadsheetSaveResult['errors']
  validating: boolean
}

/**
 * Spreadsheet mode of a `Table::spreadsheet()` table (loaded on first use): a keyboard
 * grid over the page's records. Edits stay local (highlighted) until "Save" sends them in
 * one request; the server validates each cell with its column's rules and the record's
 * `update` policy, and its errors show on the cells.
 */
export function Spreadsheet({ table, token, component, onClose }: SpreadsheetProps) {
  const t = useT()
  const choice = useChoice()
  const direction = useDirection()
  const panel = usePanel()
  const baseId = useId()
  const columns = useMemo(() => spreadsheetColumns(table), [table])
  const rows = useMemo(
    () => spreadsheetRows(table.records ?? [], columns),
    [table.records, columns],
  )
  const [grid] = useState(() => new SpreadsheetGrid(rows, columns))
  const state = useStore(grid.store)
  const [announcement, setAnnouncement] = useState('')
  const [preview, setPreview] = useState<PastePreview | null>(null)
  const gridRef = useRef<HTMLTableElement | null>(null)
  const endpoint = panel.endpoints.tableCells

  // A reload (save, live update, polling) brings new records; edits of rows still on the
  // page are kept.
  useEffect(() => grid.setData(rows, columns), [grid, rows, columns])

  const {
    list,
    range,
    indexes,
    attach,
    item: attachRow,
  } = useVirtualList(rows.length, virtualizeOptions(table.virtualize, VIRTUAL_ESTIMATES.row))

  const announce = (message: SpreadsheetAnnouncement | null) => {
    if (message) setAnnouncement(choice(message.key, message.count, {}, message.fallback))
  }

  // Keep focus on the active cell (roving tabindex), scrolling a virtualised row into view.
  useEffect(() => {
    if (state.editing) return

    const root = gridRef.current

    if (!root || !root.contains(document.activeElement)) return

    const { row, col } = state.active
    const cell = document.getElementById(spreadsheetCellId(baseId, row, col))

    if (cell) {
      cell.focus({ preventScroll: false })
      cell.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    } else {
      list.scrollToIndex(row)
    }
  }, [state.active, state.editing, baseId, list])

  const save = async () => {
    const changes = grid.changes()

    if (!endpoint || changes.length === 0 || state.saving) return

    grid.setSaving(true)

    try {
      const result = await saveSpreadsheetChanges(endpoint, token, component, changes)

      grid.applySaveResult(result)

      if (result.saved.length > 0) {
        announce(spreadsheetAnnouncement('saved', result.saved.length))
        inertiaReload()
      }

      if (result.errors.length > 0) {
        announce(spreadsheetAnnouncement('failed', result.errors.length))
      }
    } catch (error) {
      showToast({
        id: 'alfakit-spreadsheet-failed',
        title: t('table.spreadsheet.request_failed', {}, "Couldn't save the changes"),
        body: error instanceof Error ? error.message : String(error),
        status: 'danger',
        format: 'alfakit',
      })
    } finally {
      grid.setSaving(false)
    }
  }

  const undoSave = async () => {
    const changes = grid.undoSaveChanges()

    if (!endpoint || changes.length === 0) return

    grid.setSaving(true)

    try {
      const result = await saveSpreadsheetChanges(endpoint, token, component, changes)

      grid.applySaveResult(result)
      announce(spreadsheetAnnouncement('undo', result.saved.length))

      if (result.saved.length > 0) inertiaReload()
    } finally {
      grid.setSaving(false)
    }
  }

  const close = () => {
    if (
      grid.dirtyCount > 0 &&
      !window.confirm(t('table.spreadsheet.discard_confirm', {}, 'Discard your unsaved changes?'))
    ) {
      return
    }

    grid.discard()
    onClose()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const result = grid.handleKey(event, direction)

    if (result === 'ignored') return

    event.preventDefault()

    if (result === 'save') {
      void save()
    } else if (result === 'undo') {
      announce(spreadsheetAnnouncement('undo', grid.undo()))
    } else if (result === 'fill' || result === 'clear') {
      announce(spreadsheetAnnouncement(result, grid.lastApplied))
    }

    if (result === 'commit' || result === 'cancel' || result === 'toggle') {
      // Back from the editor to the cell.
      requestAnimationFrame(() =>
        document
          .getElementById(spreadsheetCellId(baseId, grid.state.active.row, grid.state.active.col))
          ?.focus(),
      )
    }
  }

  const onCopy = (event: ClipboardEvent<HTMLTableElement>) => {
    if (grid.state.editing) return

    event.preventDefault()
    event.clipboardData.setData('text/plain', grid.copyText())
    announce(spreadsheetAnnouncement('copy', spreadsheetSelectionSize(grid.bounds())))
  }

  const onPaste = (event: ClipboardEvent<HTMLTableElement>) => {
    if (grid.state.editing) return

    event.preventDefault()

    const plan = grid.planPaste(event.clipboardData.getData('text/plain'))

    if (plan.changes.length === 0 && plan.issues.length === 0) return

    setPreview({ plan, errors: [], validating: Boolean(endpoint && plan.changes.length > 0) })

    if (!endpoint || plan.changes.length === 0) return

    // Validate the pasted values on the server before they are applied.
    void saveSpreadsheetChanges(
      endpoint,
      token,
      component,
      plan.changes.map((change) => {
        const record = grid.getRows()[change.row]
        const column = grid.getColumns()[change.col]

        return { record: record?.key ?? '', column: column?.name ?? '', state: change.value }
      }),
      { dryRun: true },
    )
      .then((result) =>
        setPreview(
          (current) => current && { ...current, errors: result.errors, validating: false },
        ),
      )
      .catch(() => setPreview((current) => current && { ...current, validating: false }))
  }

  const applyPaste = () => {
    if (!preview) return

    const count = grid.apply(preview.plan.changes)

    if (preview.errors.length > 0) grid.setErrors(preview.errors)

    announce(spreadsheetAnnouncement('paste', count))
    setPreview(null)
  }

  const issueText = (issue: PastePlan['issues'][number]) => {
    const message = SPREADSHEET_ISSUE_MESSAGES[issue.reason]

    return t(
      message.key,
      { text: issue.text, column: columns[issue.col]?.label ?? '', row: issue.row + 1 },
      message.fallback,
    )
  }

  const errorList = grid.errorCells()

  const helpId = `${baseId}-help`

  return (
    <div data-slot="spreadsheet" className="flex flex-col gap-3">
      <div data-slot="spreadsheet-toolbar" className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={grid.dirtyCount === 0 || state.saving}
          onClick={() => void save()}
        >
          {state.saving && <Spinner />}
          {t('table.spreadsheet.save', {}, 'Save changes')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!grid.canUndo || state.saving}
          onClick={() => announce(spreadsheetAnnouncement('undo', grid.undo()))}
        >
          {t('table.spreadsheet.undo', {}, 'Undo')}
        </Button>
        {grid.canUndoSave && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={state.saving}
            onClick={() => void undoSave()}
          >
            {t('table.spreadsheet.undo_save', {}, 'Undo last save')}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={grid.dirtyCount === 0 || state.saving}
          onClick={() => grid.discard()}
        >
          {t('table.spreadsheet.discard', {}, 'Discard')}
        </Button>
        <span className="text-muted-foreground text-sm" aria-live="polite">
          {grid.dirtyCount > 0 &&
            choice(
              'table.spreadsheet.unsaved',
              grid.dirtyCount,
              {},
              ':count unsaved change|:count unsaved changes',
            )}
          {grid.errorCount > 0 && (
            <span className="text-destructive ms-2">
              {choice(
                'table.spreadsheet.errors',
                grid.errorCount,
                {},
                ':count error|:count errors',
              )}
            </span>
          )}
        </span>
        <span className="flex-1" />
        <Button type="button" size="sm" variant="outline" onClick={close}>
          {t('table.spreadsheet.close', {}, 'Done')}
        </Button>
      </div>
      <p id={helpId} className="sr-only">
        {t(
          'table.spreadsheet.help',
          {},
          'Arrow keys move between cells. Enter or F2 edits a cell, Escape cancels, Tab moves to the next cell. Ctrl+C copies, Ctrl+V pastes, Ctrl+D fills down, Ctrl+Z undoes and Ctrl+S saves.',
        )}
      </p>
      <div data-surface="table" className={SPREADSHEET_CLASSES.root} style={{ maxHeight: '70vh' }}>
        <table
          ref={gridRef}
          role="grid"
          aria-label={table.heading ?? t('table.spreadsheet.label', {}, 'Spreadsheet')}
          aria-describedby={helpId}
          aria-rowcount={rows.length + 1}
          aria-colcount={columns.length}
          aria-multiselectable="true"
          aria-busy={state.saving || undefined}
          data-slot="spreadsheet-grid"
          className={SPREADSHEET_CLASSES.table}
          onKeyDown={onKeyDown}
          onCopy={onCopy}
          onPaste={onPaste}
        >
          <thead>
            <tr aria-rowindex={1}>
              {columns.map((column, col) => (
                <th
                  key={column.name}
                  role="columnheader"
                  scope="col"
                  aria-colindex={col + 1}
                  className={SPREADSHEET_CLASSES.header}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody ref={attach}>
            <VirtualSpacerRow height={range.before} colSpan={columns.length} />
            {indexes.map((row) => {
              const record = rows[row]

              if (!record) return null

              return (
                <tr
                  key={String(record.key)}
                  ref={attachRow}
                  data-index={row}
                  aria-rowindex={row + 2}
                >
                  {columns.map((column, col) => {
                    const active = grid.isActive(row, col)
                    const editing =
                      state.editing && state.editing.row === row && state.editing.col === col
                    const errors = grid.errorsAt(row, col)
                    const value = grid.value(row, col)
                    const editable = grid.isEditable(row, col)

                    return (
                      <td
                        key={column.name}
                        id={spreadsheetCellId(baseId, row, col)}
                        role="gridcell"
                        {...spreadsheetAria(row, col)}
                        tabIndex={active ? 0 : -1}
                        aria-selected={grid.isSelected(row, col)}
                        aria-readonly={!editable || undefined}
                        aria-invalid={errors.length > 0 || undefined}
                        title={errors.join(' ') || undefined}
                        data-slot="spreadsheet-cell"
                        data-dirty={grid.isDirty(row, col) || undefined}
                        data-active={active || undefined}
                        className={spreadsheetCellClass(grid, row, col)}
                        onMouseDown={(event) => {
                          if (editing) return

                          grid.moveTo(row, col, event.shiftKey)
                        }}
                        onDoubleClick={() => grid.beginEdit()}
                      >
                        {editing && column.kind === 'select' ? (
                          <select
                            autoFocus
                            className={SPREADSHEET_CLASSES.editor}
                            aria-label={column.label}
                            value={
                              state.editing?.value === null || state.editing?.value === undefined
                                ? ''
                                : String(state.editing.value)
                            }
                            onChange={(event) => {
                              grid.updateDraft(event.target.value)
                              grid.commitEdit()
                              document.getElementById(spreadsheetCellId(baseId, row, col))?.focus()
                            }}
                            onBlur={() => grid.cancelEdit()}
                          >
                            <option value="">{t('table.spreadsheet.no_value', {}, '—')}</option>
                            {column.options?.map((option) => (
                              <option
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                              >
                                {option.label.replace(/<[^>]*>/g, '')}
                              </option>
                            ))}
                          </select>
                        ) : editing ? (
                          <input
                            autoFocus
                            type={column.kind === 'number' ? 'text' : (column.inputType ?? 'text')}
                            inputMode={column.kind === 'number' ? 'decimal' : undefined}
                            className={SPREADSHEET_CLASSES.editor}
                            aria-label={column.label}
                            value={
                              state.editing?.value === null || state.editing?.value === undefined
                                ? ''
                                : String(state.editing.value)
                            }
                            onChange={(event) => grid.updateDraft(event.target.value)}
                            onBlur={() => grid.commitEdit()}
                          />
                        ) : column.kind === 'boolean' ? (
                          <span className="inline-flex items-center gap-1">
                            <span
                              aria-hidden="true"
                              className="border-input data-[checked=true]:bg-primary data-[checked=true]:text-primary-foreground inline-flex size-4 items-center justify-center rounded-[4px] border"
                              data-checked={Boolean(value)}
                            >
                              {Boolean(value) && <CheckIcon className="size-3" />}
                            </span>
                            <span className="sr-only">
                              {value
                                ? t('table.spreadsheet.yes', {}, 'Yes')
                                : t('table.spreadsheet.no', {}, 'No')}
                            </span>
                          </span>
                        ) : (
                          grid.text(row, col)
                        )}
                        {errors.length > 0 && <span className="sr-only">{errors.join(' ')}</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            <VirtualSpacerRow height={range.after} colSpan={columns.length} />
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="text-muted-foreground p-6 text-center text-sm">
            {t('table.spreadsheet.empty', {}, 'No records to edit.')}
          </p>
        )}
      </div>
      {errorList.length > 0 && (
        <ul data-slot="spreadsheet-errors" className="text-destructive flex flex-col gap-1 text-sm">
          {errorList.map((error) => (
            <li key={error.key}>
              <button
                type="button"
                className="text-start hover:underline"
                onClick={() => {
                  grid.moveTo(error.row, error.col)
                  document.getElementById(spreadsheetCellId(baseId, error.row, error.col))?.focus()
                }}
              >
                {t(
                  'table.spreadsheet.cell_error',
                  {
                    row: error.row + 1,
                    column: columns[error.col]?.label ?? '',
                    message: error.messages.join(' '),
                  },
                  'Row :row, :column: :message',
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <span
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-slot="spreadsheet-announcement"
      >
        {announcement}
      </span>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('table.spreadsheet.paste_title', {}, 'Paste cells')}</DialogTitle>
            <DialogDescription>
              {choice(
                'table.spreadsheet.paste_summary',
                preview?.plan.changes.length ?? 0,
                {},
                ':count cell will change|:count cells will change',
              )}
              {(preview?.plan.skipped ?? 0) > 0 &&
                ` ${choice('table.spreadsheet.paste_skipped', preview?.plan.skipped ?? 0, {}, ':count read-only cell is skipped|:count read-only cells are skipped')}`}
            </DialogDescription>
          </DialogHeader>
          <div data-slot="spreadsheet-paste" className="flex flex-col gap-3">
            {preview?.validating && (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Spinner />
                {t('table.spreadsheet.paste_validating', {}, 'Checking the values…')}
              </p>
            )}
            {preview && (preview.plan.issues.length > 0 || preview.errors.length > 0) && (
              <ul className="text-destructive flex max-h-48 flex-col gap-1 overflow-auto text-sm">
                {preview.plan.issues.map((issue) => (
                  <li key={`issue-${issue.row}-${issue.col}`}>{issueText(issue)}</li>
                ))}
                {preview.errors.map((error) => {
                  const position = grid.position(error.record, error.column)
                  const column = columns.find((item) => item.name === error.column)
                  const row = position?.row ?? -1

                  return (
                    <li key={`error-${String(error.record)}-${error.column}`}>
                      {t(
                        'table.spreadsheet.cell_error',
                        {
                          row: row + 1,
                          column: column?.label ?? error.column,
                          message: error.messages.join(' '),
                        },
                        'Row :row, :column: :message',
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreview(null)}>
              {t('cancel', {}, 'Cancel')}
            </Button>
            <Button
              type="button"
              disabled={!preview || preview.plan.changes.length === 0}
              onClick={applyPaste}
            >
              {t('table.spreadsheet.paste_apply', {}, 'Apply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
