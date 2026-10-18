/**
 * Enter in a text field submits the form, like a native form with a submit button. AlfaKit
 * renders form actions as `type="button"` (they post through the action runner), so browsers
 * never submit implicitly: renderers call this from the form's keydown handler and run the
 * primary action when it returns true.
 */

/** Input types for which browsers perform implicit submission. */
const SUBMITTING_INPUT_TYPES = new Set([
  'text',
  'email',
  'password',
  'search',
  'tel',
  'url',
  'number',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
])

export interface ImplicitSubmitEvent {
  key: string
  isComposing?: boolean
  defaultPrevented: boolean
  shiftKey?: boolean
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  target: EventTarget | null
}

export function isImplicitSubmit(event: ImplicitSubmitEvent, form: Element): boolean {
  if (event.key !== 'Enter' || event.isComposing || event.defaultPrevented) return false
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false

  const target = event.target

  if (typeof HTMLInputElement === 'undefined' || !(target instanceof HTMLInputElement)) return false

  // Portalled popovers (select search, date pickers) bubble through the component tree but
  // are not inside the form element.
  if (!form.contains(target)) return false

  if (!SUBMITTING_INPUT_TYPES.has(target.type) || target.readOnly || target.disabled) return false

  // Comboboxes, tag inputs and other widgets that use Enter themselves.
  if (target.getAttribute('role') === 'combobox' || target.getAttribute('aria-autocomplete'))
    return false

  // A wizard moves step by step; Enter must not submit every step at once.
  if (form.querySelector('[data-surface="wizard"]')) return false

  return true
}
