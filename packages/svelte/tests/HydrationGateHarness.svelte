<script lang="ts">
  import Icon from '../src/lib/Icon.svelte'
  import Lazy from '../src/lib/Lazy.svelte'
  import type { LazyLoader } from '../src/lib/lazy'

  let { loader }: { loader: LazyLoader<Record<string, never>> } = $props()
</script>

<Icon name="users" />
<Lazy {loader} props={{}}>
  {#snippet fallback()}<span data-fallback=""></span>{/snippet}
</Lazy>
