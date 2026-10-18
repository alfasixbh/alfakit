<script lang="ts">
  import type { AnalyticsBreakdownWidgetSchema } from '@alfakit/core'
  import { analyticsInitialTab } from '@alfakit/core'
  import { untrack } from 'svelte'
  import { useDirection, useT } from '../../context.svelte'
  import { Card } from '../ui/card'
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
  import AnalyticsBreakdownRow from './AnalyticsBreakdownRow.svelte'

  /**
   * An analytics top list (`analytics:breakdown`): a tab per dimension, each row a bar
   * that links to the dashboard filtered by it. Every number arrives formatted by the server.
   */
  let { widget }: { widget: AnalyticsBreakdownWidgetSchema } = $props()

  const t = useT()
  const direction = useDirection()

  let active = $state(untrack(() => analyticsInitialTab(widget)))

  $effect(() => {
    if (!widget.tabs.some((tab) => tab.key === active)) active = analyticsInitialTab(widget)
  })
</script>

<Card data-slot="analytics-breakdown" class="gap-0 overflow-hidden py-0">
  <Tabs bind:value={active} dir={direction} class="gap-0">
    <div class="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
      <h3 class="text-base font-semibold">{widget.heading}</h3>
      {#if widget.tabs.length > 1}
        <TabsList
          aria-label={t('analytics.views', { panel: widget.heading }, ':panel views')}
          class="max-w-full overflow-x-auto"
        >
          {#each widget.tabs as tab (tab.key)}
            <TabsTrigger
              value={tab.key}
              class="flex-none"
              data-filtered={tab.filtered ? 'true' : undefined}
            >
              {tab.label}
            </TabsTrigger>
          {/each}
        </TabsList>
      {/if}
    </div>
    {#each widget.tabs as tab (tab.key)}
      <TabsContent value={tab.key} class="px-3 pb-4">
        <div
          class="text-muted-foreground flex items-center gap-3 px-2 pb-1.5 text-xs font-medium tracking-wide uppercase"
          aria-hidden="true"
        >
          <span class="min-w-0 flex-1 truncate">{tab.columns[0]}</span>
          <span class="w-16 text-end">{tab.columns[1]}</span>
          <span class="hidden w-20 text-end sm:block">{tab.columns[2]}</span>
        </div>
        {#if tab.rows.length === 0}
          <p class="text-muted-foreground px-2 py-6 text-center text-sm">
            {widget.emptyLabel ?? t('analytics.empty', {}, 'No data for this period')}
          </p>
        {:else}
          <ul class="flex flex-col gap-0.5" aria-label={tab.label}>
            {#each tab.rows as row (row.key)}
              <li><AnalyticsBreakdownRow {row} columns={tab.columns} /></li>
            {/each}
          </ul>
        {/if}
      </TabsContent>
    {/each}
  </Tabs>
</Card>
