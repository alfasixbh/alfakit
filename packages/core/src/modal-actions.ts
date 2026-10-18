import type { ActionContext } from './actions'
import type { ActionSchema } from './schema/actions'
import { createStore, type Store } from './store'

/** Separator between action names in a nested modal action path (`Action::PATH_SEPARATOR`). */
export const ACTION_PATH_SEPARATOR = '>'

/** Request input carrying the password of `requiresPasswordConfirmation()` actions. */
export const PASSWORD_CONFIRMATION_INPUT = 'confirmPassword'

/**
 * The name the server resolves an action by: its own name, prefixed by the names of the
 * actions whose modals it sits in (`edit>preview`).
 */
export function actionPath(action: Pick<ActionSchema, 'name'>, context: ActionContext): string {
  return [...(context.parents ?? []), action.name].join(ACTION_PATH_SEPARATOR)
}

/** The context for actions rendered inside `action`'s modal (its extra footer actions). */
export function nestedActionContext(
  context: ActionContext,
  action: Pick<ActionSchema, 'name'>,
): ActionContext {
  return { ...context, parents: [...(context.parents ?? []), action.name] }
}

/**
 * The schema component id of an action's modal form, for the schema refresh and options
 * endpoints (`action:table.edit`, `action:edit>preview`).
 */
export function actionFormComponent(
  action: Pick<ActionSchema, 'name'>,
  context: ActionContext,
): string {
  const path = actionPath(action, context)

  return context.component && context.component !== 'page'
    ? `action:${context.component}.${path}`
    : `action:${path}`
}

/** Where a wizard is: 0-based step and the number of steps. */
export interface WizardProgress {
  step: number
  count: number
}

const wizardProgress = new WeakMap<object, Store<WizardProgress>>()

/**
 * The progress of the wizard rendered in a form (keyed by its FormStore). A wizard
 * reports its step here so the action modal around it can show the submit button on the
 * last step only.
 */
export function wizardProgressStore(owner: object): Store<WizardProgress> {
  let store = wizardProgress.get(owner)

  if (!store) {
    store = createStore<WizardProgress>({ step: 0, count: 0 })
    wizardProgress.set(owner, store)
  }

  return store
}

export function reportWizardProgress(
  owner: object | null | undefined,
  step: number,
  count: number,
): void {
  if (!owner) return

  const store = wizardProgressStore(owner)
  const current = store.get()

  if (current.step !== step || current.count !== count) {
    store.set({ step, count })
  }
}

/** Whether a modal's submit button is shown: always, except before a wizard's last step. */
export function isModalSubmitVisible(
  modal: { wizard?: boolean | null },
  progress: WizardProgress | null | undefined,
): boolean {
  if (!modal.wizard || !progress || progress.count === 0) {
    return true
  }

  return progress.step >= progress.count - 1
}
