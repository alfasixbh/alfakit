<script lang="ts">
  import type { FormBlock as FormBlockSchema } from '@alfakit/core'
  import { formIdentity } from '@alfakit/core'
  import { usePageSchema } from '../../context.svelte'
  import FormBlockInner from './FormBlockInner.svelte'

  let { block }: { block: FormBlockSchema } = $props()

  // The store survives reloads of the same form (table sorting/paging, polling,
  // relation-manager actions all deliver a new `block` object); only a different form
  // identity remounts it and starts from server state again.
  const identity = $derived(formIdentity(usePageSchema(), block))
</script>

{#key identity}
  <FormBlockInner {block} />
{/key}
