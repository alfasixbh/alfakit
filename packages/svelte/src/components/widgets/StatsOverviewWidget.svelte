<script lang="ts">
  import type { StatsOverviewWidgetSchema } from '@alfakit/core'
  import { gridColumnsClasses, widgetPollTarget } from '@alfakit/core'
  import { usePollComponent } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import StatCard from './StatCard.svelte'
  import { useLiveUpdates } from '../realtime/live-updates.svelte'

  let { widget }: { widget: StatsOverviewWidgetSchema } = $props()

  const columns = $derived(
    widget.columns ?? {
      default: 1,
      md: Math.min(widget.stats.length, 2),
      lg: Math.min(widget.stats.length, 4),
    },
  )

  // Polls refresh only this widget, share one request with other components on the same
  // interval and pause while the tab is hidden. Derived primitives keep the subscription
  // across reloads that bring a new `widget` object.
  const pollTarget = $derived(widgetPollTarget(widget))
  const pollingInterval = $derived(widget.pollingInterval)
  const pollComponent = usePollComponent()

  $effect(() => pollComponent(pollTarget, pollingInterval))

  // `live()`: refresh when the followed records change (broadcast), else poll as a fallback.
  useLiveUpdates(() => ({
    live: widget.live,
    target: pollTarget,
    polling: Boolean(pollingInterval),
  }))
</script>

<section class="flex flex-col gap-3" aria-label={widget.heading}>
  {#if widget.heading || widget.description}
    <div>
      {#if widget.heading}<h3 class="text-base font-semibold">{widget.heading}</h3>{/if}
      {#if widget.description}<p class="text-muted-foreground text-sm">{widget.description}</p>{/if}
    </div>
  {/if}
  <div class={cn('grid gap-4', gridColumnsClasses(columns))}>
    {#each widget.stats as stat, index (index)}
      <StatCard {stat} />
    {/each}
  </div>
</section>
