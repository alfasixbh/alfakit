<script lang="ts">
  import type { FileUploadSchema, FormStore } from '@alfakit/core'
  import FileUploadField from '../src/components/fields/FileUploadField.svelte'
  import FormProvider from '../src/components/form/FormProvider.svelte'

  /** One FileUpload field whose schema the test replaces (a template item re-rendering). */
  let { store, component }: { store: FormStore; component: FileUploadSchema } = $props()
</script>

<FormProvider {store}>
  <FileUploadField {component} />
</FormProvider>
