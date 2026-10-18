<script lang="ts" module>
  import type { TranslationManagerSchema } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The translation editor's code loads the first time it is shown.
  const loader = lazyLoader<{ component?: TranslationManagerSchema }>(() =>
    import('./TranslationManager.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import Lazy from '../../lib/Lazy.svelte'
  import { Card, CardContent } from '../ui/card'
  import { Skeleton } from '../ui/skeleton'

  let { component }: { component?: TranslationManagerSchema } = $props()

  const count = $derived(Math.min(8, Math.max(3, component?.rows.length ?? 5)))
</script>

<Lazy {loader} props={{ component }}>
  {#snippet fallback()}
    <Card class="gap-4 py-4" aria-busy="true" data-slot="translation-manager">
      <CardContent class="flex flex-col gap-2 px-5" aria-hidden="true">
        <Skeleton class="h-9" />
        {#each { length: count } as _, index (index)}
          <Skeleton class="h-12" />
        {/each}
      </CardContent>
    </Card>
  {/snippet}
</Lazy>
