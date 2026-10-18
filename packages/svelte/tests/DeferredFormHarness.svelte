<script lang="ts">
  import type { FormStore } from '@alfakit/core'
  import FormProvider from '../src/components/form/FormProvider.svelte'
  import SchemaRenderer from '../src/components/schema/SchemaRenderer.svelte'
  import { useStore } from '../src/hooks/store.svelte'

  /** A form whose components follow the store (deferred components merge into it). */
  let { store }: { store: FormStore } = $props()
  const state = useStore(store.store)
</script>

<FormProvider {store}>
  <SchemaRenderer components={state.current.components} />
</FormProvider>
