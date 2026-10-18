<script lang="ts">
  import type { FormStore } from '@alfakit/core'
  import FormProvider from '../src/components/form/FormProvider.svelte'
  import SchemaRenderer from '../src/components/schema/SchemaRenderer.svelte'

  let { store }: { store: FormStore } = $props()
</script>

<FormProvider {store}>
  <SchemaRenderer components={store.state.components} />
</FormProvider>
