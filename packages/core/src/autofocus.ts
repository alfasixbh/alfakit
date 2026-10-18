import type { SchemaComponent } from './schema/components'

/**
 * Refocusing a form's `autofocus()` field, e.g. after "Create & create another" kept the
 * modal open with a fresh form: the wizard step holding the field is shown again (through
 * the wizard's `goToStep`), an inactive tab holding it is selected, and the field's input
 * gets the focus.
 */

interface Ancestor {
  component: SchemaComponent
  /** The child (tab or step) of `component` the field is in. */
  child: SchemaComponent
}

/** The state path of the first field with `autofocus()`, and its ancestors (outermost first). */
export function findAutofocusField(
  components: SchemaComponent[],
  ancestors: Ancestor[] = [],
): { statePath: string; ancestors: Ancestor[] } | null {
  for (const component of components) {
    const field = component as SchemaComponent & { statePath?: string; autofocus?: boolean }

    if (field.autofocus && typeof field.statePath === 'string') {
      return { statePath: field.statePath, ancestors }
    }

    for (const child of component.schema ?? []) {
      const found = findAutofocusField([child], [...ancestors, { component, child }])

      if (found) return found
    }
  }

  return null
}

let revealRequests = 0

/**
 * The components with every wizard around the `autofocus()` field asked to show the step
 * holding it (`goToStep`, which wizards accept for earlier steps).
 */
export function revealAutofocusField(components: SchemaComponent[]): SchemaComponent[] {
  const found = findAutofocusField(components)
  const wizards = new Map<SchemaComponent, string>()

  for (const { component, child } of found?.ancestors ?? []) {
    if (component.type === 'Wizard' && typeof child.key === 'string') {
      wizards.set(component, child.key)
    }
  }

  if (wizards.size === 0) return components

  const map = (list: SchemaComponent[]): SchemaComponent[] =>
    list.map((component) => {
      const step = wizards.get(component)
      const schema = component.schema ? map(component.schema) : component.schema

      if (step === undefined)
        return schema === component.schema ? component : { ...component, schema }

      revealRequests++

      return {
        ...component,
        schema,
        goToStep: { step, id: `autofocus-${revealRequests}` },
      } as SchemaComponent
    })

  return map(components)
}

const FOCUSABLE =
  'input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled), [contenteditable="true"], button:not(:disabled), [tabindex]:not([tabindex="-1"])'

/** Select the tabs (inactive `role="tabpanel"` ancestors) that hide `element`. */
function revealTabs(element: Element, root: ParentNode): void {
  const panels: HTMLElement[] = []

  for (let node = element.parentElement; node; node = node.parentElement) {
    if (
      node.getAttribute('role') === 'tabpanel' &&
      node.getAttribute('data-state') === 'inactive'
    ) {
      panels.unshift(node)
    }

    if (node === root) break
  }

  for (const panel of panels) {
    const id = panel.getAttribute('aria-labelledby')
    const trigger = id ? panel.ownerDocument.getElementById(id) : null

    if (!trigger) continue

    // Tab primitives select on mousedown (Radix, Reka) or click (Bits).
    trigger.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }),
    )
    trigger.click()
  }
}

/**
 * Focus the `autofocus()` field of `components` inside `root`, selecting the tabs that
 * hide it first. Returns false when there is no such field (or it can't take focus yet).
 */
export function focusAutofocusField(
  root: HTMLElement | null | undefined,
  components: SchemaComponent[],
): boolean {
  const found = findAutofocusField(components)

  if (!root || !found) return false

  const escaped =
    typeof CSS !== 'undefined' && CSS.escape
      ? CSS.escape(found.statePath)
      : found.statePath.replace(/"/g, '\\"')
  const field = root.querySelector(`[data-field="${escaped}"]`)

  if (!field) return false

  revealTabs(field, root)

  const input = field.querySelector<HTMLElement>(FOCUSABLE)

  input?.focus()

  return Boolean(input)
}

/**
 * Focus the `autofocus()` field after the next render (two frames: one to select the tab
 * that hides it, one to focus it once shown). Returns a cancel function.
 */
export function scheduleAutofocus(
  root: () => HTMLElement | null | undefined,
  components: SchemaComponent[],
): () => void {
  if (typeof requestAnimationFrame === 'undefined') return () => {}

  let frame = requestAnimationFrame(() => {
    focusAutofocusField(root(), components)

    frame = requestAnimationFrame(() => {
      const element = root()

      if (element && !element.contains(document.activeElement))
        focusAutofocusField(element, components)
    })
  })

  return () => cancelAnimationFrame(frame)
}
