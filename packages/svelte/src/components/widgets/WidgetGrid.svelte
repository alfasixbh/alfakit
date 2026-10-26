<script lang="ts" module>
  import type { ComponentProps } from 'svelte'
  import { lazyLoader } from '../../lib/lazy'
  import type DashboardCustomizerComponent from './DashboardCustomizer.svelte'

  // The dashboard editor's code loads with the first customizable dashboard; until then (and
  // on the server) its widgets show in the plain grid.
  const customizer = lazyLoader<ComponentProps<typeof DashboardCustomizerComponent>>(() =>
    import('./DashboardCustomizer.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import { uniqueKey } from '../../lib/keys'
  import type { WidgetsBlock } from '@alfakit/core'
  import { columnSpanClasses, gridColumnsClasses, isLazyPlaceholder } from '@alfakit/core'
  import { cn } from '../../lib/utils'
  import LazyWidgetPlaceholder from '../panel/LazyWidgetPlaceholder.svelte'
  import Lazy from '../../lib/Lazy.svelte'
  import WidgetRenderer from './WidgetRenderer.svelte'

  let { block }: { block: WidgetsBlock } = $props()
</script>

{#snippet grid()}
  <div data-slot="widgets" class={cn('grid gap-6', gridColumnsClasses(block.columns))}>
    {#each block.widgets as widget, widgetIndex (uniqueKey(block.widgets, widgetIndex, (item) => item.key))}
      <div class={cn('min-w-0', columnSpanClasses(widget.columnSpan))}>
        {#if isLazyPlaceholder(widget)}
          <LazyWidgetPlaceholder {widget} />
        {:else}
          <WidgetRenderer {widget} />
        {/if}
      </div>
    {/each}
  </div>
{/snippet}

<!-- `Dashboard::customizable()`: the grid with its "Edit dashboard" mode. -->
{#if block.customize}
  <Lazy loader={customizer} props={{ block, customize: block.customize }} fallback={grid} />
{:else}
  {@render grid()}
{/if}
