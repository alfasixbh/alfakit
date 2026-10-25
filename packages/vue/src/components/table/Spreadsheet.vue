<script setup lang="ts">
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
import { CheckIcon } from '@lucide/vue'
import { computed, nextTick, ref, useId, watch } from 'vue'
import { useStore } from '../../composables/use-store'
import { useVirtualList } from '../../composables/use-virtual-list'
import { useChoice, useDirection, usePanel, useT } from '../../context'
import { showToast } from '../notifications/flash-toasts'
import VirtualSpacerRow from '../schema/VirtualSpacerRow.vue'
import Button from '../ui/Button.vue'
import Dialog from '../ui/Dialog.vue'
import DialogContent from '../ui/DialogContent.vue'
import DialogDescription from '../ui/DialogDescription.vue'
import DialogFooter from '../ui/DialogFooter.vue'
import DialogHeader from '../ui/DialogHeader.vue'
import DialogTitle from '../ui/DialogTitle.vue'
import Spinner from '../ui/Spinner.vue'

/**
 * Spreadsheet mode of a `Table::spreadsheet()` table (loaded on first use): a keyboard
 * grid over the page's records. Edits stay local (highlighted) until "Save" sends them in
 * one request; the server validates each cell with its column's rules and the record's
 * `update` policy, and its errors show on the cells.
 */
const props = defineProps<{ table: TableSchema; token: string; component: string }>()
const emit = defineEmits<{ close: [] }>()

interface PastePreview {
  plan: PastePlan
  errors: SpreadsheetSaveResult['errors']
  validating: boolean
}

const t = useT()
const choice = useChoice()
const direction = useDirection()
const panel = usePanel()
const baseId = `spreadsheet-${useId()}`
const columns = computed(() => spreadsheetColumns(props.table))
const rows = computed(() => spreadsheetRows(props.table.records ?? [], columns.value))
const grid = new SpreadsheetGrid(rows.value, columns.value)
const state = useStore(grid.store)
const announcement = ref('')
const preview = ref<PastePreview | null>(null)
const gridElement = ref<HTMLTableElement | null>(null)
const helpId = `${baseId}-help`

// A reload (save, live update, polling) brings new records; edits of rows still on the
// page are kept.
watch([rows, columns], ([nextRows, nextColumns]) => grid.setData(nextRows, nextColumns))

const virtual = useVirtualList(
  () => rows.value.length,
  () => virtualizeOptions(props.table.virtualize, VIRTUAL_ESTIMATES.row),
)

const endpoint = computed(() => panel.value.endpoints.tableCells)
const errorList = computed(() => {
  void state.value

  return grid.errorCells()
})

function announce(message: SpreadsheetAnnouncement | null) {
  if (message) announcement.value = choice(message.key, message.count, {}, message.fallback)
}

function focusCell(row: number, col: number) {
  void nextTick(() => {
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
watch(
  () => [state.value.active, state.value.editing] as const,
  ([active, editing]) => {
    if (editing || !gridElement.value?.contains(document.activeElement)) return

    focusCell(active.row, active.col)
  },
)

async function save() {
  const changes = grid.changes()

  if (!endpoint.value || changes.length === 0 || state.value.saving) return

  grid.setSaving(true)

  try {
    const result = await saveSpreadsheetChanges(
      endpoint.value,
      props.token,
      props.component,
      changes,
    )

    grid.applySaveResult(result)

    if (result.saved.length > 0) {
      announce(spreadsheetAnnouncement('saved', result.saved.length))
      inertiaReload()
    }

    if (result.errors.length > 0) announce(spreadsheetAnnouncement('failed', result.errors.length))
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

  if (!endpoint.value || changes.length === 0) return

  grid.setSaving(true)

  try {
    const result = await saveSpreadsheetChanges(
      endpoint.value,
      props.token,
      props.component,
      changes,
    )

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
  emit('close')
}

function onKeyDown(event: KeyboardEvent) {
  const result = grid.handleKey(event, direction.value)

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

  const url = endpoint.value

  preview.value = { plan, errors: [], validating: Boolean(url && plan.changes.length > 0) }

  if (!url || plan.changes.length === 0) return

  // Validate the pasted values on the server before they are applied.
  saveSpreadsheetChanges(
    url,
    props.token,
    props.component,
    plan.changes.map((change) => ({
      record: grid.getRows()[change.row]?.key ?? '',
      column: grid.getColumns()[change.col]?.name ?? '',
      state: change.value,
    })),
    { dryRun: true },
  )
    .then((result) => {
      if (preview.value)
        preview.value = { ...preview.value, errors: result.errors, validating: false }
    })
    .catch(() => {
      if (preview.value) preview.value = { ...preview.value, validating: false }
    })
}

function applyPaste() {
  const current = preview.value

  if (!current) return

  const count = grid.apply(current.plan.changes)

  if (current.errors.length > 0) grid.setErrors(current.errors)

  announce(spreadsheetAnnouncement('paste', count))
  preview.value = null
}

function issueText(issue: PastePlan['issues'][number]): string {
  const message = SPREADSHEET_ISSUE_MESSAGES[issue.reason]

  return t(
    message.key,
    { text: issue.text, column: columns.value[issue.col]?.label ?? '', row: issue.row + 1 },
    message.fallback,
  )
}

function errorText(record: SpreadsheetSaveResult['errors'][number]): string {
  const position = grid.position(record.record, record.column)

  return t(
    'table.spreadsheet.cell_error',
    {
      row: (position?.row ?? -1) + 1,
      column: columns.value.find((column) => column.name === record.column)?.label ?? record.column,
      message: record.messages.join(' '),
    },
    'Row :row, :column: :message',
  )
}

function draft(): string {
  const value = state.value.editing?.value

  return value === null || value === undefined ? '' : String(value)
}

function isEditing(row: number, col: number): boolean {
  return state.value.editing?.row === row && state.value.editing.col === col
}

function onSelectChange(event: Event, row: number, col: number) {
  grid.updateDraft((event.target as HTMLSelectElement).value)
  grid.commitEdit()
  focusCell(row, col)
}

const optionText = (label: string) => label.replace(/<[^>]*>/g, '')

/** Focus an editor as soon as it is shown. */
const vFocus = { mounted: (element: HTMLElement) => element.focus() }
</script>

<template>
  <div data-slot="spreadsheet" class="flex flex-col gap-3">
    <div data-slot="spreadsheet-toolbar" class="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        :disabled="grid.dirtyCount === 0 || state.saving"
        @click="save"
      >
        <Spinner v-if="state.saving" />
        {{ t('table.spreadsheet.save', {}, 'Save changes') }}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        :disabled="!grid.canUndo || state.saving"
        @click="announce(spreadsheetAnnouncement('undo', grid.undo()))"
      >
        {{ t('table.spreadsheet.undo', {}, 'Undo') }}
      </Button>
      <Button
        v-if="grid.canUndoSave"
        type="button"
        size="sm"
        variant="outline"
        :disabled="state.saving"
        @click="undoSave"
      >
        {{ t('table.spreadsheet.undo_save', {}, 'Undo last save') }}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        :disabled="grid.dirtyCount === 0 || state.saving"
        @click="grid.discard()"
      >
        {{ t('table.spreadsheet.discard', {}, 'Discard') }}
      </Button>
      <span class="text-muted-foreground text-sm" aria-live="polite">
        <template v-if="grid.dirtyCount > 0">{{
          choice(
            'table.spreadsheet.unsaved',
            grid.dirtyCount,
            {},
            ':count unsaved change|:count unsaved changes',
          )
        }}</template>
        <span v-if="grid.errorCount > 0" class="text-destructive ms-2">{{
          choice('table.spreadsheet.errors', grid.errorCount, {}, ':count error|:count errors')
        }}</span>
      </span>
      <span class="flex-1" />
      <Button type="button" size="sm" variant="outline" @click="close">
        {{ t('table.spreadsheet.close', {}, 'Done') }}
      </Button>
    </div>
    <p :id="helpId" class="sr-only">
      {{
        t(
          'table.spreadsheet.help',
          {},
          'Arrow keys move between cells. Enter or F2 edits a cell, Escape cancels, Tab moves to the next cell. Ctrl+C copies, Ctrl+V pastes, Ctrl+D fills down, Ctrl+Z undoes and Ctrl+S saves.',
        )
      }}
    </p>
    <div data-surface="table" :class="SPREADSHEET_CLASSES.root" style="max-height: 70vh">
      <table
        ref="gridElement"
        role="grid"
        :aria-label="props.table.heading ?? t('table.spreadsheet.label', {}, 'Spreadsheet')"
        :aria-describedby="helpId"
        :aria-rowcount="rows.length + 1"
        :aria-colcount="columns.length"
        aria-multiselectable="true"
        :aria-busy="state.saving || undefined"
        data-slot="spreadsheet-grid"
        :class="SPREADSHEET_CLASSES.table"
        @keydown="onKeyDown"
        @copy="onCopy"
        @paste="onPaste"
      >
        <thead>
          <tr aria-rowindex="1">
            <th
              v-for="(column, col) in columns"
              :key="column.name"
              role="columnheader"
              scope="col"
              :aria-colindex="col + 1"
              :class="SPREADSHEET_CLASSES.header"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody :ref="virtual.attach">
          <VirtualSpacerRow :height="virtual.range.value.before" :col-span="columns.length" />
          <template v-for="row in virtual.indexes.value" :key="String(rows[row]?.key ?? row)">
            <tr v-if="rows[row]" :ref="virtual.item" :data-index="row" :aria-rowindex="row + 2">
              <td
                v-for="(column, col) in columns"
                :id="spreadsheetCellId(baseId, row, col)"
                :key="column.name"
                role="gridcell"
                v-bind="spreadsheetAria(row, col)"
                :tabindex="grid.isActive(row, col) ? 0 : -1"
                :aria-selected="grid.isSelected(row, col)"
                :aria-readonly="!grid.isEditable(row, col) || undefined"
                :aria-invalid="grid.errorsAt(row, col).length > 0 || undefined"
                :title="grid.errorsAt(row, col).join(' ') || undefined"
                data-slot="spreadsheet-cell"
                :data-dirty="grid.isDirty(row, col) || undefined"
                :data-active="grid.isActive(row, col) || undefined"
                :class="spreadsheetCellClass(grid, row, col)"
                @mousedown="!isEditing(row, col) && grid.moveTo(row, col, $event.shiftKey)"
                @dblclick="grid.beginEdit()"
              >
                <select
                  v-if="isEditing(row, col) && column.kind === 'select'"
                  v-focus
                  :class="SPREADSHEET_CLASSES.editor"
                  :aria-label="column.label"
                  :value="draft()"
                  @change="onSelectChange($event, row, col)"
                  @blur="grid.cancelEdit()"
                >
                  <option value="">{{ t('table.spreadsheet.no_value', {}, '—') }}</option>
                  <option
                    v-for="option in column.options"
                    :key="option.value"
                    :value="option.value"
                    :disabled="option.disabled"
                  >
                    {{ optionText(option.label) }}
                  </option>
                </select>
                <input
                  v-else-if="isEditing(row, col)"
                  v-focus
                  :type="column.kind === 'number' ? 'text' : (column.inputType ?? 'text')"
                  :inputmode="column.kind === 'number' ? 'decimal' : undefined"
                  :class="SPREADSHEET_CLASSES.editor"
                  :aria-label="column.label"
                  :value="draft()"
                  @input="grid.updateDraft(($event.target as HTMLInputElement).value)"
                  @blur="grid.commitEdit()"
                />
                <span v-else-if="column.kind === 'boolean'" class="inline-flex items-center gap-1">
                  <span
                    aria-hidden="true"
                    class="border-input data-[checked=true]:bg-primary data-[checked=true]:text-primary-foreground inline-flex size-4 items-center justify-center rounded-[4px] border"
                    :data-checked="Boolean(grid.value(row, col))"
                  >
                    <CheckIcon v-if="grid.value(row, col)" class="size-3" />
                  </span>
                  <span class="sr-only">{{
                    grid.value(row, col)
                      ? t('table.spreadsheet.yes', {}, 'Yes')
                      : t('table.spreadsheet.no', {}, 'No')
                  }}</span>
                </span>
                <template v-else>{{ grid.text(row, col) }}</template>
                <span v-if="grid.errorsAt(row, col).length > 0" class="sr-only">{{
                  grid.errorsAt(row, col).join(' ')
                }}</span>
              </td>
            </tr>
          </template>
          <VirtualSpacerRow :height="virtual.range.value.after" :col-span="columns.length" />
        </tbody>
      </table>
      <p v-if="rows.length === 0" class="text-muted-foreground p-6 text-center text-sm">
        {{ t('table.spreadsheet.empty', {}, 'No records to edit.') }}
      </p>
    </div>
    <ul
      v-if="errorList.length > 0"
      data-slot="spreadsheet-errors"
      class="text-destructive flex flex-col gap-1 text-sm"
    >
      <li v-for="error in errorList" :key="error.key">
        <button
          type="button"
          class="text-start hover:underline"
          @click="
            () => {
              grid.moveTo(error.row, error.col)
              focusCell(error.row, error.col)
            }
          "
        >
          {{
            t(
              'table.spreadsheet.cell_error',
              {
                row: error.row + 1,
                column: columns[error.col]?.label ?? '',
                message: error.messages.join(' '),
              },
              'Row :row, :column: :message',
            )
          }}
        </button>
      </li>
    </ul>
    <span
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
      data-slot="spreadsheet-announcement"
      >{{ announcement }}</span
    >

    <Dialog :open="preview !== null" @update:open="(value) => !value && (preview = null)">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ t('table.spreadsheet.paste_title', {}, 'Paste cells') }}</DialogTitle>
          <DialogDescription>
            <!-- One line per count: translations can't join two sentences. -->
            <span class="block">{{
              choice(
                'table.spreadsheet.paste_summary',
                preview?.plan.changes.length ?? 0,
                {},
                ':count cell will change|:count cells will change',
              )
            }}</span>
            <span
              v-if="(preview?.plan.skipped ?? 0) > 0"
              class="block"
              data-slot="spreadsheet-paste-skipped"
            >
              {{
                choice(
                  'table.spreadsheet.paste_skipped',
                  preview?.plan.skipped ?? 0,
                  {},
                  ':count read-only cell is skipped|:count read-only cells are skipped',
                )
              }}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div data-slot="spreadsheet-paste" class="flex flex-col gap-3">
          <p
            v-if="preview?.validating"
            class="text-muted-foreground flex items-center gap-2 text-sm"
          >
            <Spinner />
            {{ t('table.spreadsheet.paste_validating', {}, 'Checking the values…') }}
          </p>
          <ul
            v-if="preview && (preview.plan.issues.length > 0 || preview.errors.length > 0)"
            class="text-destructive flex max-h-48 flex-col gap-1 overflow-auto text-sm"
          >
            <li v-for="issue in preview.plan.issues" :key="`issue-${issue.row}-${issue.col}`">
              {{ issueText(issue) }}
            </li>
            <li
              v-for="error in preview.errors"
              :key="`error-${String(error.record)}-${error.column}`"
            >
              {{ errorText(error) }}
            </li>
          </ul>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="preview = null">{{
            t('cancel', {}, 'Cancel')
          }}</Button>
          <Button
            type="button"
            :disabled="!preview || preview.plan.changes.length === 0"
            @click="applyPaste"
          >
            {{ t('table.spreadsheet.paste_apply', {}, 'Apply') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
