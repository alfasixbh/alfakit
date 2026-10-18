<script lang="ts" module>
  import type { CmsLivePreviewSchema } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The live preview's code loads the first time a page editor is opened.
  const loader = lazyLoader<{ component: CmsLivePreviewSchema }>(() =>
    import('./LivePreview.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import Lazy from '../../lib/Lazy.svelte'

  let { component }: { component: CmsLivePreviewSchema } = $props()
</script>

<Lazy {loader} props={{ component }}>
  {#snippet fallback()}
    <div data-slot="cms-live-preview" class="h-8" aria-hidden="true"></div>
  {/snippet}
</Lazy>
