<script lang="ts">
  import type { ViewEntrySchema } from '@alfakit/core'
  import { useRegistry, useT } from '../../context.svelte'
  import EntryWrapper from './EntryWrapper.svelte'

  // `ViewEntry`: the application component registered under the entry's `view()` name.
  let { component }: { component: ViewEntrySchema } = $props()

  const t = useT()
  const registry = useRegistry()
  const name = $derived(component.component ?? '')
  const Custom = $derived(name ? registry.resolve(name) : undefined)
</script>

<EntryWrapper entry={component}>
  {#if Custom}
    <Custom {...component.props ?? {}} state={component.state} {component} />
  {:else}
    <span class="text-destructive text-xs"
      >{t(
        'component_not_registered',
        { component: name },
        `Component ${name} is not registered.`,
      )}</span
    >
  {/if}
</EntryWrapper>
