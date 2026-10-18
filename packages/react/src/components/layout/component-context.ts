import type { BaseComponent, FormState, SchemaComponentContextValue, Store } from '@alfakit/core'
import { createSchemaComponentContext } from '@alfakit/core'
import { useMemo } from 'react'
import { useStoreSelector } from '../../hooks/use-store'
import { useOptionalFormStore } from '../form/form-context'

const NO_FORM: Pick<Store<FormState | null>, 'get' | 'subscribe'> = {
  get: () => null,
  subscribe: () => () => {},
}

/**
 * What a custom schema component can read about its schema: other components' state
 * (`get('../other')`, like PHP's `$get()`), the whole form `state`, and the `operation`,
 * `recordKey`, `record` attributes and `data` the PHP component exposes with
 * `exposeContext()`. Outside a form (infolists) `state` is `null`.
 */
export function useSchemaComponentContext(
  component: Pick<BaseComponent, 'context'> & { statePath?: string },
): SchemaComponentContextValue {
  const form = useOptionalFormStore()
  const state = useStoreSelector<FormState | null, Record<string, unknown> | null>(
    form?.store ?? NO_FORM,
    (value) => (value ? value.values : null),
  )

  return useMemo(
    () => createSchemaComponentContext(component.context, state, component.statePath),
    [component.context, component.statePath, state],
  )
}
