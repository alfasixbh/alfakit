<script lang="ts" module>
  import type { CalendarWidgetSchema } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // FullCalendar loads the first time a calendar is shown.
  const loader = lazyLoader<{ widget: CalendarWidgetSchema }>(() =>
    import('./CalendarWidget.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import { useT } from '../../context.svelte'
  import Lazy from '../../lib/Lazy.svelte'
  import { Card, CardContent } from '../ui/card'
  import { Skeleton } from '../ui/skeleton'

  let { widget }: { widget: CalendarWidgetSchema } = $props()
  const t = useT()
</script>

<Lazy {loader} props={{ widget }}>
  {#snippet fallback()}
    <Card class="gap-4 py-4" aria-busy="true" data-slot="calendar-widget">
      <CardContent class="flex flex-col gap-4 px-5">
        <span class="sr-only">{t('calendar.loading', {}, 'Loading calendar')}</span>
        {#if widget.heading}
          <Skeleton class="h-5 w-1/3" aria-hidden="true" />
        {/if}
        <div class="flex items-center justify-between gap-3" aria-hidden="true">
          <Skeleton class="h-8 w-28" />
          <Skeleton class="h-6 w-40" />
          <Skeleton class="h-8 w-40" />
        </div>
        <Skeleton class="h-[28rem]" aria-hidden="true" />
      </CardContent>
    </Card>
  {/snippet}
</Lazy>
