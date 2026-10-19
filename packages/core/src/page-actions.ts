import type { ActionContext } from './actions'
import type { AlfakitFlash } from './flash'
import type { FormStore } from './form'
import type { WizardProgress } from './modal-actions'
import type { ActionSchema } from './schema/actions'
import type { FormBlock } from './schema/form'
import type { DefaultActionSchema, PageSchema } from './schema/panel'
import { setPath } from './utils/path'

/**
 * Page-level runtime shared by the renderers: the default action opened after a page
 * hydrated, page forms submitted from buttons elsewhere (`Action::formId()`), form data
 * refreshed by the server (`refreshFormData()`), and the filters of chart widgets.
 */

// ---------------------------------------------------------------- Default actions

/** Query-string keys that ask a page to open an action (`?tableAction=edit&tableActionRecord=1`). */
export const DEFAULT_ACTION_QUERY_KEYS = [
  'defaultAction',
  'defaultActionArguments',
  'defaultActionContext',
  'tableAction',
  'tableActionRecord',
  'tableActionArguments',
  // Filament's deep-link keys (`?action=sendEmail&actionArguments[source]=email`).
  'action',
  'actionArguments',
  'actionComponent',
] as const

/** The action context the default action opens in. */
export function defaultActionContext(
  page: Pick<PageSchema, 'token'>,
  defaultAction: DefaultActionSchema,
): ActionContext {
  return {
    token: page.token,
    component: defaultAction.component,
    ...(defaultAction.record !== undefined && defaultAction.record !== null
      ? { record: defaultAction.record }
      : {}),
    ...(defaultAction.arguments ? { arguments: defaultAction.arguments } : {}),
  }
}

/**
 * Identifies "this default action on this page". A page re-rendered after the action ran
 * (the server redirects back) still names it, so renderers remember the key they opened
 * and open it again only for another page or another action.
 */
export function defaultActionKey(
  page: Pick<PageSchema, 'class' | 'record' | 'defaultAction'>,
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '',
): string | null {
  const action = page.defaultAction

  if (!action) return null

  return JSON.stringify([
    page.class,
    page.record ?? null,
    pathname,
    action.component,
    action.action.name,
    action.record ?? null,
  ])
}

/** The URL without the query-string keys that open an action (bracketed forms included). */
export function withoutDefaultActionQuery(href: string): string {
  const url = new URL(href, 'http://localhost')
  const keys = [...url.searchParams.keys()]

  for (const key of keys) {
    const base = key.replace(/\[.*$/, '')

    if ((DEFAULT_ACTION_QUERY_KEYS as readonly string[]).includes(base)) {
      url.searchParams.delete(key)
    }
  }

  const relative = `${url.pathname}${url.search}${url.hash}`

  return /^https?:\/\//.test(href) ? url.toString() : relative
}

export interface DefaultActionOpener {
  /** Key of the default action opened last (see `defaultActionKey()`). */
  opened: string | null
}

/**
 * Open the page's default action once per page: call after every page render. The query
 * string that asked for it is removed (without a visit), so later redirects back to the
 * page don't open it again. Returns whether it was opened now.
 */
export function openDefaultAction(
  page: PageSchema | undefined,
  opener: DefaultActionOpener,
  trigger: (action: ActionSchema, context: ActionContext) => void | Promise<void>,
): boolean {
  if (!page?.defaultAction) {
    opener.opened = null

    return false
  }

  const key = defaultActionKey(page)

  if (key === null || key === opener.opened) return false

  opener.opened = key

  if (typeof window !== 'undefined') {
    const clean = withoutDefaultActionQuery(window.location.href)

    if (clean !== window.location.href) {
      window.history.replaceState(window.history.state, '', clean)
    }
  }

  void trigger(page.defaultAction.action, defaultActionContext(page, page.defaultAction))

  return true
}

// ---------------------------------------------------------------- Page form submitters

type FormSubmitter = (action: ActionSchema, context: ActionContext) => void | Promise<void>

const formSubmitters = new Map<string, FormSubmitter>()

/**
 * A page form publishes how it submits itself (with its state, processing flag and
 * error handling), so buttons with `formId()` elsewhere on the page can use it.
 * `form` is the page form; named forms register as `form:{name}`.
 */
export function registerFormSubmitter(component: string, submit: FormSubmitter): () => void {
  formSubmitters.set(component, submit)

  return () => {
    if (formSubmitters.get(component) === submit) {
      formSubmitters.delete(component)
    }
  }
}

/**
 * Submit the form an action's `formId` names. Returns false when the action has no
 * `formId`, is a plain link, or no such form is on the page (the caller then runs the
 * action normally).
 */
export function submitFormById(action: ActionSchema, context: ActionContext): boolean {
  if (!action.formId || (action.url && !action.hasAction)) return false

  const submit =
    formSubmitters.get(action.formId) ??
    (action.formId.startsWith('form:') ? undefined : formSubmitters.get(`form:${action.formId}`))

  if (!submit) return false

  void submit(action, context)

  return true
}

// ---------------------------------------------------------------- Form refresh

/** The paths `refreshFormData()` sent for this form, or null. */
export function formRefreshFor(
  flash: Pick<AlfakitFlash, 'alfakitFormRefresh'>,
  component: string,
): Record<string, unknown> | null {
  const refresh = flash.alfakitFormRefresh

  return refresh && refresh.component === component && refresh.state ? refresh.state : null
}

/**
 * Copy refreshed values into a form store. The paths stop counting as edited (and lose
 * their errors); every other field keeps what the user typed.
 */
export function applyFormRefresh(store: FormStore, state: Record<string, unknown>): void {
  const paths = Object.keys(state)

  if (paths.length === 0) return

  store.store.set((current) => {
    let values = current.values
    const dirty = new Set(current.dirty)
    const errors = { ...current.errors }

    for (const path of paths) {
      values = setPath(values, path, state[path])
      dirty.delete(path)
      delete errors[path]
    }

    return { ...current, values, dirty, errors }
  })
}

/**
 * Whether a page form reloads from the server's new schema after a visit it did not submit
 * itself: another action (one embedded in a field, a table row in a relation manager)
 * succeeded while the form held no edits. Its components may show server state that the
 * action changed (a status, which actions are offered); with unsaved edits the form keeps
 * what the user typed.
 */
export function shouldResyncForm(
  flash: Pick<AlfakitFlash, 'alfakitAction'>,
  store: Pick<FormStore, 'isDirty'>,
): boolean {
  return flash.alfakitAction?.status === 'success' && !store.isDirty
}

// ---------------------------------------------------------------- Wizard pages

/** Whether a page form shows its buttons: always, except before a wizard form's last step. */
export function formActionsVisible(
  block: Pick<FormBlock, 'wizard'>,
  progress: WizardProgress | null | undefined,
): boolean {
  if (!block.wizard || !progress || progress.count === 0) return true

  return progress.step >= progress.count - 1
}

// ---------------------------------------------------------------- Chart filters

/**
 * The URL with a chart widget's filter values in the query string
 * (`chartFilters[{id}][field]=value`, lists as `[field][]`). The widget's previous values
 * are replaced; empty values are left out; other query values stay.
 */
export function chartFiltersUrl(
  href: string,
  queryKey: string,
  widgetId: string,
  state: Record<string, unknown> | null,
): string {
  const url = new URL(href, 'http://localhost')
  const prefix = `${queryKey}[${widgetId}]`

  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith(prefix)) url.searchParams.delete(key)
  }

  for (const [field, value] of Object.entries(state ?? {})) {
    if (value === null || value === undefined || value === '') continue

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && item !== undefined)
          url.searchParams.append(`${prefix}[${field}][]`, String(item))
      }

      continue
    }

    url.searchParams.set(
      `${prefix}[${field}]`,
      typeof value === 'boolean' ? (value ? '1' : '0') : String(value),
    )
  }

  const relative = `${url.pathname}${url.search}${url.hash}`

  return /^https?:\/\//.test(href) ? url.toString() : relative
}
