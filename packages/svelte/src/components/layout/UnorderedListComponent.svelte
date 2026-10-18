<script lang="ts">
  import type { UnorderedListSchema } from '@alfakit/core'
  import { extraProps } from '../../lib/attributes'
  import { uniqueKey } from '../../lib/keys'
  import { cn } from '../../lib/utils'
  import RenderComponent from '../schema/RenderComponent.svelte'

  const SIZES: Record<string, string> = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  let { component }: { component: UnorderedListSchema } = $props()
  const items = $derived(component.schema ?? [])
</script>

<ul
  data-slot="unordered-list"
  {...extraProps(
    component.extraAttributes,
    cn(
      'marker:text-muted-foreground flex list-disc flex-col gap-1 ps-5',
      SIZES[component.size ?? 'sm'] ?? 'text-sm',
    ),
  )}
>
  {#each items as item, index (uniqueKey(items, index, (entry) => entry.key))}
    <li><RenderComponent component={item} /></li>
  {/each}
</ul>
