<script lang="ts">
  import type { FormStore } from '@alfakit/core'
  import FormProvider from '../src/components/form/FormProvider.svelte'
  import SchemaRenderer from '../src/components/schema/SchemaRenderer.svelte'

  let { store, onsubmit }: { store: FormStore; onsubmit?: (event: SubmitEvent) => void } = $props()
</script>

<FormProvider {store}>
  <form {onsubmit}>
    <SchemaRenderer components={store.state.components} />
  </form>
</FormProvider>
