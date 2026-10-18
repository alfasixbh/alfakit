<script lang="ts" module>
  import type { KanbanSchema, KanbanWidgetSchema } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The board's code loads the first time a board is shown.
  const loader = lazyLoader<{ component?: KanbanSchema; widget?: KanbanWidgetSchema }>(() =>
    import('./Kanban.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import Lazy from '../../lib/Lazy.svelte'
  import { Card, CardContent } from '../ui/card'
  import { Skeleton } from '../ui/skeleton'

  let { component, widget }: { component?: KanbanSchema; widget?: KanbanWidgetSchema } = $props()

  const count = $derived(
    Math.min(5, Math.max(1, (component ?? widget?.kanban)?.columns.length ?? 3)),
  )
</script>

<Lazy {loader} props={{ component, widget }}>
  {#snippet fallback()}
    <Card class="gap-4 py-4" aria-busy="true" data-slot="kanban">
      <CardContent class="flex gap-3 overflow-hidden px-4" aria-hidden="true">
        {#each { length: count } as _, index (index)}
          <div class="flex w-64 shrink-0 flex-col gap-2">
            <Skeleton class="h-10" />
            <Skeleton class="h-24" />
            <Skeleton class="h-24" />
          </div>
        {/each}
      </CardContent>
    </Card>
  {/snippet}
</Lazy>
