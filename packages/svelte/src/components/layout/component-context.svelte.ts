import type { BaseComponent, FormState, SchemaComponentContextValue, Store } from '@alfakit/core'
import { createSchemaComponentContext } from '@alfakit/core'
import { useStoreSelector } from '../../hooks/store.svelte'
import { useOptionalFormStore } from '../form/form-context.svelte'

const NO_FORM: Pick<Store<FormState | null>, 'get' | 'subscribe'> = {
  get: () => null,
  subscribe: () => () => {},
}

type ContextSource = Pick<BaseComponent, 'context'> & { statePath?: string }

/**
 * What a custom schema component can read about its schema: other components' state
 * (`get('../other')`, like PHP's `$get()`), the whole form `state`, and the `operation`,
 * `recordKey`, `record` attributes and `data` the PHP component exposes with
 * `exposeContext()`. Outside a form (infolists) `state` is `null`. Pass a getter
 * (`() => component`) to follow prop updates; read the result's `current`.
 */
export function useSchemaComponentContext(component: ContextSource | (() => ContextSource)): {
  readonly current: SchemaComponentContextValue
} {
  const form = useOptionalFormStore()
  const state = useStoreSelector<FormState | null, Record<string, unknown> | null>(
    form?.store ?? NO_FORM,
    (value) => (value ? value.values : null),
  )
  const resolve = typeof component === 'function' ? component : () => component
  const current = $derived.by(() => {
    const source = resolve()

    return createSchemaComponentContext(source.context, state.current, source.statePath)
  })

  return {
    get current() {
      return current
    },
  }
}
