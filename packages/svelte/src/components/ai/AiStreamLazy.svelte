<script lang="ts" module>
  import type { AiStreamSchema } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // A streamed AI answer: its code loads the first time an answer streams.
  const loader = lazyLoader<{ component: AiStreamSchema }>(() =>
    import('./AiStream.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import Lazy from '../../lib/Lazy.svelte'

  let { component }: { component: AiStreamSchema } = $props()
</script>

<Lazy {loader} props={{ component }}>
  {#snippet fallback()}
    <div data-slot="ai-stream" class="h-12" aria-busy="true"></div>
  {/snippet}
</Lazy>
