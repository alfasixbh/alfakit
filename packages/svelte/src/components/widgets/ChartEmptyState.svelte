<script lang="ts">
  import type { ChartWidgetSchema } from '@alfakit/core'
  import ChartColumnIcon from '@lucide/svelte/icons/chart-column'
  import { useRegistry, useT } from '../../context.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { usePageActionContext } from '../actions/action-context'
  import ActionList from '../actions/ActionList.svelte'

  /**
   * Shown when `getData()` returns nothing: a registered `$emptyStateView` component, or
   * the icon, texts and `getEmptyStateActions()` (run through the widget, `widget:<id>`).
   */
  let { widget }: { widget: ChartWidgetSchema } = $props()
  const t = useT()
  const registry = useRegistry()
  const page = usePageActionContext()
  const state = $derived(widget.emptyState)
  const View = $derived(state?.view ? registry.resolve(state.view) : undefined)
  const context = $derived({ token: page.token, component: `widget:${widget.id}` })
  const minHeight = $derived(widget.maxHeight ?? '18rem')
</script>

{#if View}
  <div data-slot="chart-empty-state" style:min-height={minHeight}>
    <View {...state?.viewData ?? {}} {widget} />
  </div>
{:else}
  <div
    data-slot="chart-empty-state"
    class="flex flex-col items-center justify-center gap-2 py-10 text-center"
    style:min-height={minHeight}
  >
    <div
      class="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full"
    >
      {#if state?.icon}
        <Icon name={state.icon} class="size-5" />
      {:else}
        <Icon name="alfakit::widgets.chart.empty-state" fallback={ChartColumnIcon} class="size-5" />
      {/if}
    </div>
    <p class="text-sm font-medium">
      {state?.heading ?? t('chart_empty', {}, 'No data to show')}
    </p>
    {#if state?.description}
      <p class="text-muted-foreground text-sm">{state.description}</p>
    {/if}
    {#if state?.actions && state.actions.length > 0}
      <ActionList actions={state.actions} {context} size="sm" class="mt-2 justify-center" />
    {/if}
  </div>
{/if}
