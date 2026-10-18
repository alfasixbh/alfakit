import type { ActionContext } from '@alfakit/core'
import { getContext, hasContext, setContext } from 'svelte'
import { usePageSchema } from '../../context.svelte'

const PAGE_ACTION_CONTEXT = Symbol.for('alfakit.page-action')

/** Provide the page-level action context (token + `page` component) to nested components. */
export function providePageActionContext(value: ActionContext): ActionContext {
  setContext(PAGE_ACTION_CONTEXT, value)

  return value
}

export function usePageActionContext(): ActionContext {
  if (hasContext(PAGE_ACTION_CONTEXT)) {
    return getContext<ActionContext>(PAGE_ACTION_CONTEXT)
  }

  const page = usePageSchema()

  return { token: page?.token ?? '', component: 'page' }
}
