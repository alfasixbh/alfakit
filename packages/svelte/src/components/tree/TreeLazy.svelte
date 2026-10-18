<script lang="ts" module>
  import type { TreeSchema, TreeWidgetSchema } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The tree's code loads the first time a tree is shown.
  const loader = lazyLoader<{ component?: TreeSchema; widget?: TreeWidgetSchema }>(() =>
    import('./Tree.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import Lazy from '../../lib/Lazy.svelte'
  import { Card, CardContent } from '../ui/card'
  import { Skeleton } from '../ui/skeleton'

  let { component, widget }: { component?: TreeSchema; widget?: TreeWidgetSchema } = $props()

  const count = $derived(Math.min(6, Math.max(1, (component ?? widget?.tree)?.nodes.length ?? 3)))
</script>

<Lazy {loader} props={{ component, widget }}>
  {#snippet fallback()}
    <Card class="gap-4 py-4" aria-busy="true" data-slot="tree-widget">
      <CardContent class="flex flex-col gap-2 px-5" aria-hidden="true">
        {#each { length: count } as _, index (index)}
          <Skeleton class="h-9" />
        {/each}
      </CardContent>
    </Card>
  {/snippet}
</Lazy>
