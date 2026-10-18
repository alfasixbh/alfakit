<script lang="ts">
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
  import CheckIcon from '@lucide/svelte/icons/check'
  import { tick, untrack } from 'svelte'
  import { useChoice, useDirection, usePanel, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { useVirtualList } from '../../hooks/virtual.svelte'
  import { showToast } from '../notifications/toast'
  import VirtualSpacerRow from '../schema/VirtualSpacerRow.svelte'
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

  /**
   * Spreadsheet mode of a `Table::spreadsheet()` table (loaded on first use): a keyboard
   * grid over the page's records. Edits stay local (highlighted) until "Save" sends them in
   * one request; the server validates each cell with its column's rules and the record's
   * `update` policy, and its errors show on the cells.
   */
  let {
    table,
    token,
    component,
    onClose,
  }: { table: TableSchema; token: string; component: string; onClose: () => void } = $props()

  interface PastePreview {
    plan: PastePlan
    errors: SpreadsheetSaveResult['errors']
    validating: boolean
  }

  const t = useT()
  const choice = useChoice()
  const direction = useDirection()
  const panel = usePanel()
  const uid = $props.id()
  const baseId = `spreadsheet-${uid}`
  const helpId = `${baseId}-help`
  const columns = $derived(spreadsheetColumns(table))
  const rows = $derived(spreadsheetRows(table.records ?? [], columns))
  const grid = new SpreadsheetGrid(
    untrack(() => rows),
    untrack(() => columns),
  )
  const store = useStore(grid.store)
  let announcement = $state('')
  let preview = $state<PastePreview | null>(null)
  let gridElement = $state<HTMLTableElement | null>(null)

  // A reload (save, live update, polling) brings new records; edits of rows still on the
  // page are kept.
  $effect(() => {
    grid.setData(rows, columns)
  })

  const virtual = useVirtualList(
    () => rows.length,
    () => virtualizeOptions(table.virtualize, VIRTUAL_ESTIMATES.row),
  )

  // Every read of the grid goes through the store's state, so the template follows it.
  const sheet = $derived(store.current)
  const dirtyCount = $derived.by(() => {
    void sheet

    return grid.dirtyCount
  })
  const errorCount = $derived.by(() => {
    void sheet

    return grid.errorCount
  })
  const canUndo = $derived.by(() => {
    void sheet

    return grid.canUndo
  })
  const canUndoSave = $derived.by(() => {
    void sheet

    return grid.canUndoSave
  })
  const errorList = $derived.by(() => {
    void sheet

    return grid.errorCells()
  })
  const endpoint = $derived(panel.endpoints.tableCells)

  function cellInfo(row: number, col: number) {
    void sheet

    const errors = grid.errorsAt(row, col)

    return {
      active: grid.isActive(row, col),
      selected: grid.isSelected(row, col),
      editable: grid.isEditable(row, col),
      dirty: grid.isDirty(row, col),
      editing: sheet.editing?.row === row && sheet.editing.col === col,
      errors,
      value: grid.value(row, col),
      text: grid.text(row, col),
      classes: spreadsheetCellClass(grid, row, col),
    }
  }

  function announce(message: SpreadsheetAnnouncement | null) {
    if (message) announcement = choice(message.key, message.count, {}, message.fallback)
  }

  function focusCell(row: number, col: number) {
    void tick().then(() => {
      const cell = document.getElementById(spreadsheetCellId(baseId, row, col))

      if (cell) {
        cell.focus()
        cell.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
      } else {
        virtual.list.scrollToIndex(row)
      }
    })
  }

  // Keep focus on the active cell (roving tabindex).
  $effect(() => {
    const { active, editing } = sheet

    if (editing || !untrack(() => gridElement)?.contains(document.activeElement)) return

    focusCell(active.row, active.col)
  })

  async function save() {
    const changes = grid.changes()

    if (!endpoint || changes.length === 0 || grid.state.saving) return

    grid.setSaving(true)

    try {
      const result = await saveSpreadsheetChanges(endpoint, token, component, changes)

      grid.applySaveResult(result)

      if (result.saved.length > 0) {
        announce(spreadsheetAnnouncement('saved', result.saved.length))
        inertiaReload()
      }

      if (result.errors.length > 0)
        announce(spreadsheetAnnouncement('failed', result.errors.length))
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

  async function undoSave() {
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

  function close() {
    if (
      grid.dirtyCount > 0 &&
      !window.confirm(t('table.spreadsheet.discard_confirm', {}, 'Discard your unsaved changes?'))
    ) {
      return
    }

    grid.discard()
    onClose()
  }

  function onKeyDown(event: KeyboardEvent) {
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
      focusCell(grid.state.active.row, grid.state.active.col)
    }
  }

  function onCopy(event: ClipboardEvent) {
    if (grid.state.editing || !event.clipboardData) return

    event.preventDefault()
    event.clipboardData.setData('text/plain', grid.copyText())
    announce(spreadsheetAnnouncement('copy', spreadsheetSelectionSize(grid.bounds())))
  }

  function onPaste(event: ClipboardEvent) {
    if (grid.state.editing || !event.clipboardData) return

    event.preventDefault()

    const plan = grid.planPaste(event.clipboardData.getData('text/plain'))

    if (plan.changes.length === 0 && plan.issues.length === 0) return

    const url = endpoint

    preview = { plan, errors: [], validating: Boolean(url && plan.changes.length > 0) }

    if (!url || plan.changes.length === 0) return

    // Validate the pasted values on the server before they are applied.
    saveSpreadsheetChanges(
      url,
      token,
      component,
      plan.changes.map((change) => ({
        record: grid.getRows()[change.row]?.key ?? '',
        column: grid.getColumns()[change.col]?.name ?? '',
        state: change.value,
      })),
      { dryRun: true },
    )
      .then((result) => {
        if (preview) preview = { ...preview, errors: result.errors, validating: false }
      })
      .catch(() => {
        if (preview) preview = { ...preview, validating: false }
      })
  }

  function applyPaste() {
    const current = preview

    if (!current) return

    const count = grid.apply(current.plan.changes)

    if (current.errors.length > 0) grid.setErrors(current.errors)

    announce(spreadsheetAnnouncement('paste', count))
    preview = null
  }

  function issueText(issue: PastePlan['issues'][number]): string {
    const message = SPREADSHEET_ISSUE_MESSAGES[issue.reason]

    return t(
      message.key,
      { text: issue.text, column: columns[issue.col]?.label ?? '', row: issue.row + 1 },
      message.fallback,
    )
  }

  function errorText(error: SpreadsheetSaveResult['errors'][number]): string {
    const position = grid.position(error.record, error.column)

    return t(
      'table.spreadsheet.cell_error',
      {
        row: (position?.row ?? -1) + 1,
        column: columns.find((column) => column.name === error.column)?.label ?? error.column,
        message: error.messages.join(' '),
      },
      'Row :row, :column: :message',
    )
  }

  function draft(): string {
    const value = sheet.editing?.value

    return value === null || value === undefined ? '' : String(value)
  }

  function onSelectChange(event: Event, row: number, col: number) {
    grid.updateDraft((event.target as HTMLSelectElement).value)
    grid.commitEdit()
    focusCell(row, col)
  }

  /** Focus an editor as soon as it is shown. */
  function focusOnMount(element: HTMLElement) {
    element.focus()
  }

  const optionText = (label: string) => label.replace(/<[^>]*>/g, '')
</script>

<div data-slot="spreadsheet" class="flex flex-col gap-3">
  <div data-slot="spreadsheet-toolbar" class="flex flex-wrap items-center gap-2">
    <Button type="button" size="sm" disabled={dirtyCount === 0 || sheet.saving} onclick={save}>
      {#if sheet.saving}<Spinner />{/if}
      {t('table.spreadsheet.save', {}, 'Save changes')}
    </Button>
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={!canUndo || sheet.saving}
      onclick={() => announce(spreadsheetAnnouncement('undo', grid.undo()))}
    >
      {t('table.spreadsheet.undo', {}, 'Undo')}
    </Button>
    {#if canUndoSave}
      <Button type="button" size="sm" variant="outline" disabled={sheet.saving} onclick={undoSave}>
        {t('table.spreadsheet.undo_save', {}, 'Undo last save')}
      </Button>
    {/if}
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={dirtyCount === 0 || sheet.saving}
      onclick={() => grid.discard()}
    >
      {t('table.spreadsheet.discard', {}, 'Discard')}
    </Button>
    <span class="text-muted-foreground text-sm" aria-live="polite">
      {#if dirtyCount > 0}{choice(
          'table.spreadsheet.unsaved',
          dirtyCount,
          {},
          ':count unsaved change|:count unsaved changes',
        )}{/if}
      {#if errorCount > 0}
        <span class="text-destructive ms-2"
          >{choice('table.spreadsheet.errors', errorCount, {}, ':count error|:count errors')}</span
        >
      {/if}
    </span>
    <span class="flex-1"></span>
    <Button type="button" size="sm" variant="outline" onclick={close}>
      {t('table.spreadsheet.close', {}, 'Done')}
    </Button>
  </div>
  <p id={helpId} class="sr-only">
    {t(
      'table.spreadsheet.help',
      {},
      'Arrow keys move between cells. Enter or F2 edits a cell, Escape cancels, Tab moves to the next cell. Ctrl+C copies, Ctrl+V pastes, Ctrl+D fills down, Ctrl+Z undoes and Ctrl+S saves.',
    )}
  </p>
  <div data-surface="table" class={SPREADSHEET_CLASSES.root} style="max-height: 70vh">
    <table
      bind:this={gridElement}
      role="grid"
      aria-label={table.heading ?? t('table.spreadsheet.label', {}, 'Spreadsheet')}
      aria-describedby={helpId}
      aria-rowcount={rows.length + 1}
      aria-colcount={columns.length}
      aria-multiselectable="true"
      aria-busy={sheet.saving || undefined}
      data-slot="spreadsheet-grid"
      class={SPREADSHEET_CLASSES.table}
      onkeydown={onKeyDown}
      oncopy={onCopy}
      onpaste={onPaste}
    >
      <thead>
        <tr aria-rowindex={1}>
          {#each columns as column, col (column.name)}
            <th
              role="columnheader"
              scope="col"
              aria-colindex={col + 1}
              class={SPREADSHEET_CLASSES.header}>{column.label}</th
            >
          {/each}
        </tr>
      </thead>
      <tbody {@attach virtual.attach}>
        <VirtualSpacerRow height={virtual.range.before} colSpan={columns.length} />
        {#each virtual.indexes as row (String(rows[row]?.key ?? row))}
          {#if rows[row]}
            <tr {@attach virtual.item} data-index={row} aria-rowindex={row + 2}>
              {#each columns as column, col (column.name)}
                {@const info = cellInfo(row, col)}
                <td
                  id={spreadsheetCellId(baseId, row, col)}
                  role="gridcell"
                  {...spreadsheetAria(row, col)}
                  tabindex={info.active ? 0 : -1}
                  aria-selected={info.selected}
                  aria-readonly={!info.editable || undefined}
                  aria-invalid={info.errors.length > 0 || undefined}
                  title={info.errors.join(' ') || undefined}
                  data-slot="spreadsheet-cell"
                  data-dirty={info.dirty || undefined}
                  data-active={info.active || undefined}
                  class={info.classes}
                  onmousedown={(event) => !info.editing && grid.moveTo(row, col, event.shiftKey)}
                  ondblclick={() => grid.beginEdit()}
                >
                  {#if info.editing && column.kind === 'select'}
                    <select
                      {@attach focusOnMount}
                      class={SPREADSHEET_CLASSES.editor}
                      aria-label={column.label}
                      value={draft()}
                      onchange={(event) => onSelectChange(event, row, col)}
                      onblur={() => grid.cancelEdit()}
                    >
                      <option value="">{t('table.spreadsheet.no_value', {}, '—')}</option>
                      {#each column.options ?? [] as option (option.value)}
                        <option value={option.value} disabled={option.disabled}
                          >{optionText(option.label)}</option
                        >
                      {/each}
                    </select>
                  {:else if info.editing}
                    <input
                      {@attach focusOnMount}
                      type={column.kind === 'number' ? 'text' : (column.inputType ?? 'text')}
                      inputmode={column.kind === 'number' ? 'decimal' : undefined}
                      class={SPREADSHEET_CLASSES.editor}
                      aria-label={column.label}
                      value={draft()}
                      oninput={(event) =>
                        grid.updateDraft((event.target as HTMLInputElement).value)}
                      onblur={() => grid.commitEdit()}
                    />
                  {:else if column.kind === 'boolean'}
                    <span class="inline-flex items-center gap-1">
                      <span
                        aria-hidden="true"
                        class="border-input data-[checked=true]:bg-primary data-[checked=true]:text-primary-foreground inline-flex size-4 items-center justify-center rounded-[4px] border"
                        data-checked={Boolean(info.value)}
                      >
                        {#if info.value}<CheckIcon class="size-3" />{/if}
                      </span>
                      <span class="sr-only"
                        >{info.value
                          ? t('table.spreadsheet.yes', {}, 'Yes')
                          : t('table.spreadsheet.no', {}, 'No')}</span
                      >
                    </span>
                  {:else}{info.text}{/if}
                  {#if info.errors.length > 0}<span class="sr-only">{info.errors.join(' ')}</span
                    >{/if}
                </td>
              {/each}
            </tr>
          {/if}
        {/each}
        <VirtualSpacerRow height={virtual.range.after} colSpan={columns.length} />
      </tbody>
    </table>
    {#if rows.length === 0}
      <p class="text-muted-foreground p-6 text-center text-sm">
        {t('table.spreadsheet.empty', {}, 'No records to edit.')}
      </p>
    {/if}
  </div>
  {#if errorList.length > 0}
    <ul data-slot="spreadsheet-errors" class="text-destructive flex flex-col gap-1 text-sm">
      {#each errorList as error (error.key)}
        <li>
          <button
            type="button"
            class="text-start hover:underline"
            onclick={() => {
              grid.moveTo(error.row, error.col)
              focusCell(error.row, error.col)
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
      {/each}
    </ul>
  {/if}
  <span aria-live="polite" aria-atomic="true" class="sr-only" data-slot="spreadsheet-announcement"
    >{announcement}</span
  >

  <Dialog open={preview !== null} onOpenChange={(value) => !value && (preview = null)}>
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{t('table.spreadsheet.paste_title', {}, 'Paste cells')}</DialogTitle>
        <DialogDescription>
          {choice(
            'table.spreadsheet.paste_summary',
            preview?.plan.changes.length ?? 0,
            {},
            ':count cell will change|:count cells will change',
          )}
          {#if (preview?.plan.skipped ?? 0) > 0}
            {choice(
              'table.spreadsheet.paste_skipped',
              preview?.plan.skipped ?? 0,
              {},
              ':count read-only cell is skipped|:count read-only cells are skipped',
            )}
          {/if}
        </DialogDescription>
      </DialogHeader>
      <div data-slot="spreadsheet-paste" class="flex flex-col gap-3">
        {#if preview?.validating}
          <p class="text-muted-foreground flex items-center gap-2 text-sm">
            <Spinner />
            {t('table.spreadsheet.paste_validating', {}, 'Checking the values…')}
          </p>
        {/if}
        {#if preview && (preview.plan.issues.length > 0 || preview.errors.length > 0)}
          <ul class="text-destructive flex max-h-48 flex-col gap-1 overflow-auto text-sm">
            {#each preview.plan.issues as issue (`issue-${issue.row}-${issue.col}`)}
              <li>{issueText(issue)}</li>
            {/each}
            {#each preview.errors as error (`error-${String(error.record)}-${error.column}`)}
              <li>{errorText(error)}</li>
            {/each}
          </ul>
        {/if}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onclick={() => (preview = null)}>
          {t('cancel', {}, 'Cancel')}
        </Button>
        <Button
          type="button"
          disabled={!preview || preview.plan.changes.length === 0}
          onclick={applyPaste}
        >
          {t('table.spreadsheet.paste_apply', {}, 'Apply')}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</div>
