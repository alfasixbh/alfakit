<script lang="ts">
  import type { ChartWidgetSchema } from '@alfakit/core'
  import { untrack } from 'svelte'
  import ChartWidget from '../src/components/widgets/ChartWidget.svelte'

  /** Holds the widget in deeply reactive `$state`, as Inertia page props are. */
  let { initial, next }: { initial: ChartWidgetSchema; next: ChartWidgetSchema['data'] } = $props()

  let widget = $state(untrack(() => structuredClone(initial)))
</script>

<button type="button" onclick={() => (widget.data = next)}>poll</button>
<ChartWidget {widget} />
