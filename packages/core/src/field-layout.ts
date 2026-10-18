import type { Attributes, BaseField, ContentSlotName, SchemaComponent } from './schema'
import { isField } from './schema'

/**
 * Merge attribute sets from PHP (`extraAttributes()` then `extraFieldWrapperAttributes()`):
 * later sets win, except `class`, whose values are joined so no component class is lost.
 */
export function mergeAttributes(
  ...sets: Array<Attributes | null | undefined>
): Attributes | undefined {
  const present = sets.filter((set): set is Attributes => Boolean(set))

  if (present.length === 0) return undefined
  if (present.length === 1) return present[0]

  const classes: string[] = []
  const merged: Attributes = {}

  for (const set of present) {
    for (const [name, value] of Object.entries(set)) {
      if (name === 'class' || name === 'className') {
        if (typeof value === 'string' && value !== '') classes.push(value)
      } else {
        merged[name] = value
      }
    }
  }

  if (classes.length > 0) merged.class = classes.join(' ')

  return merged
}

/** Content slots shown in the label area of a field or entry. */
export const LABEL_SLOTS = ['aboveLabel', 'beforeLabel', 'afterLabel', 'belowLabel'] as const

/** Whether a component has any item in one of the given slots. */
export function hasSlots(
  component: { slots?: Partial<Record<ContentSlotName, unknown>> },
  names: readonly ContentSlotName[],
): boolean {
  return names.some((name) => Boolean(component.slots?.[name]))
}

/** Flex justification for a slot's alignment (`Alignment::Start/End/Between`). */
export function slotAlignmentClass(alignment: 'start' | 'end' | 'between' | undefined): string {
  return alignment === 'end'
    ? 'justify-end'
    : alignment === 'between'
      ? 'justify-between'
      : 'justify-start'
}

/**
 * The `step` attribute (in seconds) of a time input for `hoursStep()`, `minutesStep()`
 * and `secondsStep()`: the finest configured unit decides.
 */
export function timeInputStep(schema: {
  hasSeconds?: boolean
  hoursStep?: number
  minutesStep?: number
  secondsStep?: number
}): number | undefined {
  if (schema.hasSeconds) return schema.secondsStep ?? 1
  if (schema.minutesStep) return schema.minutesStep * 60
  if (schema.hoursStep) return schema.hoursStep * 3600

  return undefined
}

/** State paths of every field inside the components (e.g. the children of a `FusedGroup`). */
export function collectFieldStatePaths(components: SchemaComponent[] | undefined): string[] {
  const paths: string[] = []

  for (const component of components ?? []) {
    if (isField(component)) paths.push((component as BaseField).statePath)
    if (component.schema) paths.push(...collectFieldStatePaths(component.schema))
  }

  return paths
}

/**
 * Plain text of an option label sent as HTML (`allowHtml()`; the server sanitised it),
 * for places that cannot show markup: native `<option>`s and client-side filtering.
 */
export function htmlLabelToText(label: string): string {
  return label
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
}
