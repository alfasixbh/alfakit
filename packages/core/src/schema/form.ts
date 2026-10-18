import type { ActionSchema } from './actions'
import type { Breakpoints, Operation } from './common'
import type { SchemaComponent } from './components'
import type { NotificationSchema } from './notifications'

/** `Schema::toPayload()` — a component tree plus its state. */
export interface FormPayload {
  components: SchemaComponent[]
  state: Record<string, unknown>
  columns?: Breakpoints
  /**
   * Component fingerprints (index path → `own:subtree` hashes), sent for forms with live
   * fields or field actions. The store sends them back so a refresh answers with only
   * what changed (`PartialFormPayload`).
   */
  fingerprints?: Record<string, string>
}

/** A component replaced by a partial refresh, at its index path (`0.2` = `components[0].schema[2]`). */
export interface SchemaPatch {
  path: string
  component: SchemaComponent
}

/** A refresh answered with only the components and state keys that changed. */
export interface PartialFormPayload {
  partial: true
  patches: SchemaPatch[]
  fingerprints: Record<string, string>
  columns?: Breakpoints
  /** With `partialState`, only the top-level keys that differ from the state that was sent. */
  state: Record<string, unknown> | unknown[]
  partialState?: boolean
  /** Top-level keys that were sent but no longer exist (fields that became hidden). */
  removedState?: string[]
}

/** A page-level form block, including its submit actions. */
export interface FormBlock extends FormPayload {
  type: 'Form'
  key: string
  /** Context component name used by internal endpoints (`form`). */
  component: string
  actions: ActionSchema[]
  operation?: Operation
  /**
   * Dashboard filters with `live()` fields: the server stores the filters during the live
   * refresh, and the renderer reloads the page's widgets once it is merged.
   */
  liveFilters?: boolean
  /**
   * The form is a wizard (`HasWizard` Create pages): its buttons show on the wizard's last
   * step only.
   */
  wizard?: boolean
}

export interface InfolistBlock {
  type: 'Infolist'
  key: string
  components: SchemaComponent[]
}

export interface SchemaBlock {
  type: 'Schema'
  key: string
  components: SchemaComponent[]
}

export interface LinksBlock {
  type: 'Links'
  key: string
  links: Array<{ label: string; url: string }>
}

/** Response of the schema refresh endpoint. */
export type SchemaRefreshResponse = FormPayload | PartialFormPayload

export function isPartialFormPayload(
  payload: SchemaRefreshResponse,
): payload is PartialFormPayload {
  return (payload as PartialFormPayload).partial === true
}

/** Response of the action endpoint for a field action. */
export interface FieldActionResponse {
  status: 'success' | 'halted' | 'cancelled'
  result?: unknown
  closeModal?: boolean
  redirect?: string | null
  /** The owning form after the action ran (partial when fingerprints were sent). */
  form?: SchemaRefreshResponse
  /** Notifications the action sent (field actions answer with JSON, not a page visit). */
  notifications?: NotificationSchema[]
}

/**
 * Response of the step validation endpoint when a step hook halted (`throw new Halt`):
 * the wizard stays on the step and shows the notifications the hook sent. Steps that
 * pass answer 204 (no body).
 */
export interface StepValidationHaltedResponse {
  halted: true
  notifications?: NotificationSchema[]
}

export interface SelectOptionsResponse {
  options?: Array<{ value: string; label: string }>
  labels?: Record<string, string>
}
