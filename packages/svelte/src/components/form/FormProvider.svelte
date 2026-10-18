<script lang="ts">
  import type { FormStore } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import { untrack } from 'svelte'
  import { provideForm } from './form-context.svelte'

  let { store, children }: { store: FormStore; children?: Snippet } = $props()

  provideForm(untrack(() => store))
</script>

{@render children?.()}
