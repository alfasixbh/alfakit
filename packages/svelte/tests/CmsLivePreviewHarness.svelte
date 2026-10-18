<script lang="ts">
  import type { CmsLivePreviewSchema, FormStore } from '@alfakit/core'
  import LivePreview from '../src/components/cms/LivePreview.svelte'
  import { provideForm } from '../src/components/form/form-context.svelte'

  let { store, component }: { store: FormStore; component: CmsLivePreviewSchema } = $props()

  // svelte-ignore state_referenced_locally
  provideForm(store)
</script>

<LivePreview {component} />
