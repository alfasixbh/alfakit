<script lang="ts" module>
  import type { HelpdeskInboxSchema } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The inbox's code loads the first time the inbox is shown.
  const loader = lazyLoader<{ component: HelpdeskInboxSchema }>(() =>
    import('./HelpdeskInbox.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import { useT } from '../../context.svelte'
  import Lazy from '../../lib/Lazy.svelte'
  import { Card } from '../ui/card'
  import { Skeleton } from '../ui/skeleton'

  let { component }: { component: HelpdeskInboxSchema } = $props()
  const t = useT()
</script>

<Lazy {loader} props={{ component }}>
  {#snippet fallback()}
    <Card
      data-slot="helpdesk-inbox"
      aria-busy="true"
      class="grid h-[calc(100svh-12rem)] min-h-[34rem] grid-cols-1 gap-0 overflow-hidden py-0 md:grid-cols-[18rem_1fr] xl:grid-cols-[13rem_20rem_1fr]"
    >
      <span class="sr-only">{t('helpdesk.loading', {}, 'Loading…')}</span>
      <div class="flex flex-col gap-2 border-e p-2 max-xl:hidden" aria-hidden="true">
        {#each { length: 6 } as _, index (index)}
          <Skeleton class="h-7" />
        {/each}
      </div>
      <div class="flex flex-col gap-2 border-e p-2" aria-hidden="true">
        <Skeleton class="h-9" />
        {#each { length: 6 } as _, index (index)}
          <Skeleton class="h-16" />
        {/each}
      </div>
      <div class="flex flex-col gap-3 p-4 max-md:hidden" aria-hidden="true">
        <Skeleton class="h-6 w-1/2" />
        <Skeleton class="h-24" />
        <Skeleton class="h-24" />
      </div>
    </Card>
  {/snippet}
</Lazy>
