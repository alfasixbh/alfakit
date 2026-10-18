import { collectFields } from './form'
import type { IconName } from './schema/common'
import type { SchemaComponent, StepSchema, WizardSchema } from './schema/components'

/** The state paths of every field in a wizard step (including fields inside its layouts). */
export function wizardStepFieldPaths(step: Pick<SchemaComponent, 'schema'>): string[] {
  return collectFields(step.schema ?? []).map((field) => field.statePath)
}

/** Query-string key a wizard's current step is kept under (`persistStepInQueryString()`). */
export const WIZARD_STEP_QUERY_KEY = 'step'

/**
 * The query-string key a wizard keeps its step under: the server sends the key
 * (`persistStepInQueryString('order-step')`), `true` from older servers means `step`.
 */
export function wizardStepQueryKey(persist: boolean | string | null | undefined): string | null {
  if (typeof persist === 'string' && persist !== '') return persist

  return persist === true ? WIZARD_STEP_QUERY_KEY : null
}

/**
 * The step (0-based) a wizard opens on: the persisted `?step=` (1-based) when the wizard
 * persists its step and the value is valid, otherwise the server's `startStep` (1-based).
 */
export function initialWizardStep(
  stepCount: number,
  startStep: number,
  persist: boolean | string | null | undefined,
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): number {
  const clamp = (step: number) => Math.min(Math.max(0, stepCount - 1), Math.max(0, step - 1))
  const key = wizardStepQueryKey(persist)

  if (key) {
    const fromQuery = Number(new URLSearchParams(search).get(key))

    if (Number.isInteger(fromQuery) && fromQuery >= 1 && fromQuery <= stepCount) {
      return fromQuery - 1
    }
  }

  return clamp(startStep)
}

/** Write the current step (0-based) into the query string without a visit. */
export function persistWizardStep(index: number, key: string = WIZARD_STEP_QUERY_KEY): void {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  url.searchParams.set(key, String(index + 1))
  window.history.replaceState(window.history.state, '', url)
}

/** The icon of a completed step: the step's `completedIcon()`, else the wizard's. */
export function completedStepIcon(
  step: Pick<StepSchema, 'completedIcon'>,
  wizard: Pick<WizardSchema, 'completedIcon'>,
): IconName | undefined {
  return step.completedIcon ?? wizard.completedIcon
}

/**
 * The step (0-based) a server `goToStep()` request moves to, or `null` when there is none,
 * the step is unknown (hidden), or it lies ahead in a wizard that is not `skippable()`.
 */
export function wizardRequestedStepIndex(
  steps: Pick<StepSchema, 'key'>[],
  request: WizardSchema['goToStep'],
  current: number,
  skippable?: boolean | null,
): number | null {
  if (!request) return null

  const index = steps.findIndex((step) => step.key === request.step)

  if (index < 0 || (!skippable && index > current)) return null

  return index
}
