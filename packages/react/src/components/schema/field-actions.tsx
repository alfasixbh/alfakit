import type { ActionContext, ActionSchema, FieldActions } from '@alfakit/core'
import { fieldActionContext } from '@alfakit/core'
import { useMemo, type ReactNode } from 'react'
import { usePageActionContext } from '../actions/action-context'
import { ActionList } from '../actions/action-list'
import { useOptionalFormStore } from '../form/form-context'

/**
 * The action context of a field or entry's own actions (`field:{schema}::{key}`): they
 * run through the action endpoint with the form's state, and the response updates the
 * form in place.
 */
export function useFieldActionContext(component: { key: string }): ActionContext {
  const form = useOptionalFormStore()
  const page = usePageActionContext()

  return useMemo(
    () => fieldActionContext({ token: page.token, form, key: component.key }),
    [page.token, form, component.key],
  )
}

/** Hint actions, next to the label. */
export function FieldHintActions({ component }: { component: FieldActions & { key: string } }) {
  const context = useFieldActionContext(component)

  if (!component.hintActions?.length) return null

  return (
    <ActionList actions={component.hintActions} context={context} size="xs" className="gap-1" />
  )
}

function AffixActionList({
  actions,
  context,
}: {
  actions: ActionSchema[]
  context: ActionContext
}) {
  return <ActionList actions={actions} context={context} className="shrink-0 flex-nowrap gap-1" />
}

/** Prefix and suffix actions on either side of the control. */
export function FieldAffixActions({
  component,
  children,
}: {
  component: FieldActions & { key: string }
  children: ReactNode
}) {
  const context = useFieldActionContext(component)
  const prefix = component.prefixActions ?? []
  const suffix = component.suffixActions ?? []

  if (prefix.length === 0 && suffix.length === 0) {
    return <>{children}</>
  }

  return (
    <div data-slot="field-affix-actions" className="flex items-start gap-2">
      {prefix.length > 0 && <AffixActionList actions={prefix} context={context} />}
      <div className="min-w-0 flex-1">{children}</div>
      {suffix.length > 0 && <AffixActionList actions={suffix} context={context} />}
    </div>
  )
}
