import type { ActionContext } from '@alfakit/core'
import { fieldActionContext } from '@alfakit/core'
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import { usePageActionContext } from '../actions/action-context'
import { useOptionalFormStore } from '../form/form-context'

/**
 * The action context of a field or entry's own actions (`field:{schema}::{key}`): they
 * run through the action endpoint with the form's state, and the response updates the
 * form in place.
 */
export function useFieldActionContext(
  component: MaybeRefOrGetter<{ key: string }>,
): ComputedRef<ActionContext> {
  const form = useOptionalFormStore()
  const page = usePageActionContext()

  return computed(() =>
    fieldActionContext({ token: page.token, form, key: toValue(component).key }),
  )
}
