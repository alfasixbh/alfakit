<script lang="ts">
  import type { ChartWidgetSchema } from '@alfakit/core'
  import {
    buildChartConfig,
    getChartPlugins,
    observeThemeChanges,
    resolvePartialProps,
    widgetPollTarget,
  } from '@alfakit/core'
  import { router } from '@inertiajs/svelte'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import { Chart, registerables, type ChartConfiguration, type Plugin } from 'chart.js'
  import { untrack } from 'svelte'
  import { useDirection, useLocalization, usePollComponent, useT } from '../../context.svelte'
  import { cssColor } from '../../lib/colors'
  import { cn } from '../../lib/utils'
  import { Button } from '../ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
  import ChartEmptyState from './ChartEmptyState.svelte'
  import ChartFilters from './ChartFilters.svelte'
  import { useLiveUpdates } from '../realtime/live-updates.svelte'

  Chart.register(...registerables)

  let { widget }: { widget: ChartWidgetSchema } = $props()
  const t = useT()

  const rtl = $derived(useDirection() === 'rtl')
  const locale = $derived(useLocalization()?.tag ?? 'en')

  let canvas = $state<HTMLCanvasElement | null>(null)
  let chart: Chart | null = null
  // Bumped when the theme or dark mode changes so colours are re-read from CSS.
  let themeVersion = $state(0)

  $effect(() => observeThemeChanges(() => themeVersion++))

  // Chart.js mutates and instruments the objects it is given (it defines `_chartjs`
  // listeners on data arrays, adds metadata), which Svelte's deep `$state` proxies
  // reject. Hand it plain, non-reactive copies; reading them via `$state.snapshot`
  // still subscribes to every nested change, so polling brings new data in.
  const config = $derived.by(() => {
    void themeVersion

    return buildChartConfig({
      type: widget.chartType,
      data: $state.snapshot(widget.data),
      options: $state.snapshot(widget.options),
      rtl,
      locale,
      color: widget.color,
    }) as unknown as ChartConfiguration
  })

  let collapsed = $state(false)
  const bodyId = $props.id()

  // The chart is only re-created when its type changes...
  const chartType = $derived(widget.chartType)

  $effect(() => {
    const element = canvas
    void chartType

    if (!element) return

    // Build the chart outside tracking so Chart.js' internal reads (and later config
    // changes) don't become dependencies of this effect. Plugins from
    // `createAlfakit({ chartPlugins })` are registered first.
    const instance = untrack(() => {
      const plugins = getChartPlugins() as Plugin[]

      if (plugins.length > 0) Chart.register(...plugins)

      return new Chart(element, config)
    })
    chart = instance

    return () => {
      instance.destroy()
      if (chart === instance) chart = null
    }
  })

  // ...polling, theme, direction and locale changes update it in place.
  $effect(() => {
    const next = config

    untrack(() => {
      if (!chart) return

      chart.data = next.data
      chart.options = next.options ?? {}
      chart.update()
    })
  })

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

  const setFilter = (value: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set(`widgetFilters[${widget.id}]`, value)
    router.visit(url.toString(), {
      only: resolvePartialProps(['page']),
      preserveScroll: true,
      preserveState: true,
      replace: true,
    })
  }
</script>

<Card class="gap-4 py-4" data-chart-type={widget.chartType}>
  {#if widget.heading || widget.description || widget.filters || widget.filtersForm || widget.collapsible}
    <CardHeader class="px-5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          {#if widget.heading}<CardTitle class="text-base">{widget.heading}</CardTitle>{/if}
          {#if widget.description}<CardDescription>{widget.description}</CardDescription>{/if}
        </div>
        <div class="flex shrink-0 items-center gap-1">
          {#if widget.filters}
            <select
              value={widget.filter ?? ''}
              onchange={(event) => setFilter(event.currentTarget.value)}
              aria-label={t('chart_filter', {}, 'Chart filter')}
              class="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
            >
              {#each widget.filters as filter (filter.value)}
                <option value={filter.value}>{filter.label}</option>
              {/each}
            </select>
          {/if}
          {#if widget.filtersForm}
            {#key JSON.stringify(widget.filtersForm.state)}
              <ChartFilters form={widget.filtersForm} widgetId={widget.id} />
            {/key}
          {/if}
          {#if widget.collapsible}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-expanded={!collapsed}
              aria-controls={bodyId}
              aria-label={t('toggle_section', {}, 'Toggle section')}
              onclick={() => (collapsed = !collapsed)}
              ><ChevronDownIcon
                class={cn('transition-transform', collapsed && '-rotate-90 rtl:rotate-90')}
              /></Button
            >
          {/if}
        </div>
      </div>
    </CardHeader>
  {/if}
  {#if !collapsed}
    <CardContent id={bodyId} class="px-5">
      {#if widget.empty}
        <ChartEmptyState {widget} />
      {:else}
        <div
          data-slot="chart-canvas"
          style:height={widget.maxHeight ?? '18rem'}
          style:color={cssColor('gray')}
        >
          <canvas
            bind:this={canvas}
            aria-label={widget.heading ?? t('chart', {}, 'Chart')}
            aria-describedby={widget.assistiveContent ? `${bodyId}-assistive` : undefined}
          ></canvas>
          <!-- `getChartAssistiveContent()`: the chart's values for screen readers. -->
          {#if widget.assistiveContent}
            <div id={`${bodyId}-assistive`} class="sr-only" data-slot="chart-assistive-content">
              {@html widget.assistiveContent}
            </div>
          {/if}
        </div>
      {/if}
    </CardContent>
  {/if}
</Card>
