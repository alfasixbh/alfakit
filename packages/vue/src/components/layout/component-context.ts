import type { BaseComponent, FormState, SchemaComponentContextValue, Store } from '@alfakit/core'
import { createSchemaComponentContext } from '@alfakit/core'
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import { useStoreSelector } from '../../composables/use-store'
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
  component: MaybeRefOrGetter<Pick<BaseComponent, 'context'> & { statePath?: string }>,
): ComputedRef<SchemaComponentContextValue> {
  const form = useOptionalFormStore()
  const state = useStoreSelector<FormState | null, Record<string, unknown> | null>(
    form?.store ?? NO_FORM,
    (value) => (value ? value.values : null),
  )

  return computed(() => {
    const current = toValue(component)

    return createSchemaComponentContext(current.context, state.value, current.statePath)
  })
}
