<script lang="ts">
  import type { FlexSchema } from '@alfakit/core'
  import { flexItemClasses, flexLayoutClasses, schemaGapClass } from '@alfakit/core'
  import { cn } from '../../lib/utils'
  import { extraProps } from '../../lib/attributes'
  import { uniqueKey } from '../../lib/keys'
  import RenderComponent from '../schema/RenderComponent.svelte'

  let { component }: { component: FlexSchema } = $props()
  const children = $derived(component.schema ?? [])
</script>

<div
  data-slot="flex"
  {...extraProps(
    component.extraAttributes,
    cn(flexLayoutClasses(component), schemaGapClass(component)),
  )}
>
  {#each children as child, index (uniqueKey(children, index, (item) => item.key))}
    <div data-slot="flex-item" class={flexItemClasses(child)}>
      <RenderComponent component={child} />
    </div>
  {/each}
</div>
