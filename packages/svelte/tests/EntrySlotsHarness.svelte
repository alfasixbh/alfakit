<script lang="ts">
  import type { BaseEntry } from '@alfakit/core'
  import EntryWrapper from '../src/components/entries/EntryWrapper.svelte'

  let { entry }: { entry: BaseEntry } = $props()
</script>

<EntryWrapper {entry}>Hello</EntryWrapper>
