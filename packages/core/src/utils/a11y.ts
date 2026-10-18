import type { BaseColumnSchema, TableRecordSchema } from '../schema'
import type { TableSelection } from '../table'

/**
 * Accessibility helpers shared by the renderers: stable ids that link a field's label, hint,
 * helper text and error to its control, and keyboard helpers that follow the reading direction.
 */

export interface FieldDescriptionIds {
  label: string
  hint: string
  helper: string
  error: string
}

/** Ids of the elements around a form control, derived from the control's id. */
export function fieldIds(id: string): FieldDescriptionIds {
  return {
    label: `${id}-label`,
    hint: `${id}-hint`,
    helper: `${id}-helper`,
    error: `${id}-error`,
  }
}

export interface FieldAriaAttributes {
  'aria-describedby'?: string
  'aria-invalid'?: true
  'aria-required'?: true
}

export interface FieldAriaSource {
  hint?: string | null
  helperText?: string | null
  required?: boolean | null
}

/**
 * `aria-describedby`, `aria-invalid` and `aria-required` for a control. The ids match the
 * elements `FieldWrapper` renders, so they only reference text that is on the page.
 */
export function fieldAria(
  id: string,
  field: FieldAriaSource,
  error?: string | null,
): FieldAriaAttributes {
  const ids = fieldIds(id)
  const describedBy = [
    field.hint ? ids.hint : null,
    field.helperText ? ids.helper : null,
    error ? ids.error : null,
  ].filter((value): value is string => value !== null)

  const attributes: FieldAriaAttributes = {}

  if (describedBy.length > 0) {
    attributes['aria-describedby'] = describedBy.join(' ')
  }

  if (error) {
    attributes['aria-invalid'] = true
  }

  if (field.required) {
    attributes['aria-required'] = true
  }

  return attributes
}

/**
 * The same attributes without `aria-required`, for controls whose role does not support it
 * (buttons that open a picker, groups of checkboxes, drop zones).
 */
export function withoutRequired(attributes: FieldAriaAttributes): FieldAriaAttributes {
  const { 'aria-required': _required, ...rest } = attributes

  return rest
}

export type Direction = 'ltr' | 'rtl'

/**
 * Swap ArrowLeft and ArrowRight in a right-to-left layout, so "next" always follows the reading
 * direction. Other keys are returned unchanged.
 */
export function logicalArrowKey(key: string, dir: Direction | string | null | undefined): string {
  if (dir !== 'rtl') {
    return key
  }

  if (key === 'ArrowLeft') {
    return 'ArrowRight'
  }

  if (key === 'ArrowRight') {
    return 'ArrowLeft'
  }

  return key
}

export interface KeyLike {
  key: string
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
}

/**
 * The offset a keyboard "move" gesture asks for: Alt + ArrowUp/ArrowDown (vertical lists) or
 * Alt + ArrowLeft/ArrowRight (horizontal lists, flipped in RTL). Returns -1, 1 or null.
 */
export function reorderOffset(
  event: KeyLike,
  orientation: 'vertical' | 'horizontal',
  dir?: Direction | string | null,
): -1 | 1 | null {
  if (!event.altKey || event.ctrlKey || event.metaKey) {
    return null
  }

  const key = logicalArrowKey(event.key, dir)

  if (orientation === 'vertical') {
    return key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : null
  }

  return key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : null
}

/** Move one item of a list, returning a new array (the same array when the move is a no-op). */
export function moveListItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items as T[]
  }

  const copy = [...items]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item as T)

  return copy
}

/** `aria-sort` for a sortable column header. */
export function ariaSort(
  column: string,
  sortColumn: string | null | undefined,
  sortDirection: string | null | undefined,
): 'ascending' | 'descending' | 'none' {
  if (!sortColumn || sortColumn !== column) {
    return 'none'
  }

  return sortDirection === 'desc' ? 'descending' : 'ascending'
}

/** Checked state of a "select all" checkbox: true, false or 'indeterminate'. */
export function selectAllState(selected: number, total: number): boolean | 'indeterminate' {
  if (total === 0 || selected === 0) {
    return false
  }

  return selected >= total ? true : 'indeterminate'
}

/** "Select page" checkbox state: checked, unchecked or indeterminate when only some rows are. */
export function pageSelectionState(
  selection: TableSelection,
  records: TableRecordSchema[],
): boolean | 'indeterminate' {
  if (selection.state.allSelected) {
    return true
  }

  const selectable = records.filter((record) => record.selectable !== false)

  return selectAllState(
    selectable.filter((record) => selection.isSelected(record.key)).length,
    selectable.length,
  )
}

/** Column types whose cells hold their own form control. */
const INTERACTIVE_COLUMNS = new Set([
  'ToggleColumn',
  'CheckboxColumn',
  'SelectColumn',
  'TextInputColumn',
])

/**
 * The column whose cell carries a clickable row's keyboard-focusable link or button: the first
 * column that holds no control of its own (an editable cell or a copy button), so the link
 * never wraps another interactive element. Null when every column is interactive.
 */
export function primaryColumnName(
  columns: readonly (Pick<BaseColumnSchema, 'name' | 'type'> & { copyable?: boolean })[],
): string | null {
  return (
    columns.find((column) => !INTERACTIVE_COLUMNS.has(column.type) && !column.copyable)?.name ??
    null
  )
}
