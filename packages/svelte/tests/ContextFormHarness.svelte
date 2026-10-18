<script lang="ts">
  import type { FormStore, SchemaComponentContext } from '@alfakit/core'
  import FormProvider from '../src/components/form/FormProvider.svelte'
  import ContextProbe from './ContextProbe.svelte'

  let {
    store,
    context,
    statePath,
  }: { store: FormStore; context?: SchemaComponentContext; statePath?: string } = $props()
</script>

<FormProvider {store}>
  <ContextProbe {context} {statePath} />
</FormProvider>
