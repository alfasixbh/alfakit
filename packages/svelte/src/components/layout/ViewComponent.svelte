<script lang="ts">
  import type { ViewSchema } from '@alfakit/core'
  import { useRegistry, useT } from '../../context.svelte'

  let { component }: { component: ViewSchema } = $props()

  /** Custom component registered by the application through `createAlfakit({ components })`. */
  const registry = useRegistry()
  const t = useT()
  const Custom = $derived(registry.resolve(component.component))
</script>

{#if Custom}
  <Custom {...component.props ?? {}} {component} />
{:else}
  <div class="border-destructive/40 text-destructive rounded-md border border-dashed p-3 text-xs">
    {t(
      'component_not_registered',
      { component: component.component },
      `Component ${component.component} is not registered.`,
    )}
  </div>
{/if}
