<script lang="ts" module>
  import type { FileManagerSchema } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The file manager's code loads the first time it is shown.
  const loader = lazyLoader<{ component?: FileManagerSchema }>(() =>
    import('./FileManager.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import Lazy from '../../lib/Lazy.svelte'
  import FileManagerSkeleton from './FileManagerSkeleton.svelte'

  let { component }: { component?: FileManagerSchema } = $props()
</script>

<Lazy {loader} props={{ component }}>
  {#snippet fallback()}
    <FileManagerSkeleton grid={component?.view !== 'list'} />
  {/snippet}
</Lazy>
