<script lang="ts">
  import type { WidgetSchema } from '@alfakit/core'
  import { resolveFirst, widgetRegistryKeys } from '@alfakit/core'
  import { useRegistry, useT } from '../../context.svelte'
  import Slot from '../panel/Slot.svelte'
  import DataTable from '../table/DataTable.svelte'
  import ChartWidget from './ChartLazy.svelte'
  import StatsOverviewWidget from './StatsOverviewWidget.svelte'

  let { widget }: { widget: WidgetSchema } = $props()

  const registry = useRegistry()
  const t = useT()
  // Registered components win over the built-in renderers: `Widget::$component`, then
  // `widget:<type>` (e.g. `widget:Chart`), then a custom widget's own type.
  const Custom = $derived(resolveFirst(registry, widgetRegistryKeys(widget)))
  const customProps = $derived(widget.type === 'View' ? (widget.props ?? {}) : {})
</script>

{#if Custom}
  <Custom {...customProps} {widget} />
{:else if widget.type === 'StatsOverviewWidget'}
  <StatsOverviewWidget {widget} />
{:else if widget.type === 'Chart'}
  <ChartWidget {widget} />
{:else if widget.type === 'TableWidget'}
  <Slot name="table-widget.start" scope={widget.component} />
  <DataTable table={widget.table} component={widget.component} />
  <Slot name="table-widget.end" scope={widget.component} />
{:else if widget.type === 'View'}
  <div class="text-destructive rounded-md border border-dashed p-3 text-xs">
    {t(
      'widget_not_registered',
      { component: widget.component },
      'Widget component :component is not registered.',
    )}
  </div>
{/if}
