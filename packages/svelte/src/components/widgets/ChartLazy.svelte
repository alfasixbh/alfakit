<script lang="ts" module>
  import type { ChartWidgetSchema } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // Chart.js loads the first time a chart is shown.
  const loader = lazyLoader<{ widget: ChartWidgetSchema }>(() =>
    import('./ChartWidget.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import Lazy from '../../lib/Lazy.svelte'
  import { Card, CardContent } from '../ui/card'
  import { Skeleton } from '../ui/skeleton'

  let { widget }: { widget: ChartWidgetSchema } = $props()
</script>

<Lazy {loader} props={{ widget }}>
  {#snippet fallback()}
    <Card class="gap-4 py-4" aria-busy="true">
      <CardContent class="flex flex-col gap-4 px-5">
        {#if widget.heading}
          <Skeleton class="h-5 w-1/3" aria-hidden="true" />
        {/if}
        <Skeleton style="height: {widget.maxHeight ?? '18rem'}" aria-hidden="true" />
      </CardContent>
    </Card>
  {/snippet}
</Lazy>
