import type { ActionContext } from './actions'
import type { FormStore } from './form'
import { currentPageQuery } from './page-query'

/**
 * Field actions (`prefixActions()`, `suffixActions()`, `hintActions()`, a Select's create
 * and edit option buttons, a rich editor's custom blocks) are addressed as
 * `field:{schema}::{key}`: the schema the field lives in (`form`, `infolist`,
 * `action:table.edit`) and the field's key (its state path). The runner posts them as
 * JSON with the owning form's state and merges the refreshed form from the response.
 */
export const FIELD_ACTION_PREFIX = 'field:'

export interface FieldActionContextOptions {
  /** The page context token. */
  token: string
  /** The form the field belongs to; omitted for infolist entries. */
  form?: FormStore | null
  /** The field's (or entry's) key. */
  key: string
  /** Schema name when there is no form (infolist entries). */
  schema?: string
  /** Record key when the schema belongs to a table action's modal. */
  record?: string | number | null
}

export function fieldActionComponent(schema: string, key: string): string {
  return `${FIELD_ACTION_PREFIX}${schema}::${key}`
}

/** The action context for an action rendered with a field or entry. */
export function fieldActionContext(options: FieldActionContextOptions): ActionContext {
  const form = options.form ?? undefined
  const schema = form?.component ?? options.schema ?? 'infolist'

  return {
    token: form?.token || options.token,
    component: fieldActionComponent(schema, options.key),
    record: form?.record ?? options.record ?? null,
    form,
  }
}

export function isFieldActionContext(context: Pick<ActionContext, 'component'>): boolean {
  return typeof context.component === 'string' && context.component.startsWith(FIELD_ACTION_PREFIX)
}

/**
 * Extra request parameters for the modal form of an action (live refreshes and select
 * options). A field action's modal form sends its owning form's state, so the server can
 * find the field (e.g. inside a repeater item that only exists in the browser). A bulk
 * action's form (and the forms of the actions nested in its modal) sends the selection,
 * so the server resolves the bulk action and its `$records` exactly as when it runs.
 */
export function actionFormParams(
  context: Pick<ActionContext, 'component' | 'form' | 'records' | 'allRecords'>,
): (() => Record<string, unknown>) | undefined {
  const owner = context.form

  if (isFieldActionContext(context)) {
    return owner ? () => ({ ownerState: owner.state.values }) : undefined
  }

  if (context.records !== undefined) {
    return () => ({
      bulk: 1,
      records: context.records,
      allRecords: context.allRecords ? 1 : undefined,
      tableQuery: currentPageQuery(),
    })
  }

  return undefined
}
