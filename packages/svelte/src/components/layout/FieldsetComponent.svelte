<script lang="ts">
  import type { FieldsetSchema } from '@alfakit/core'
  import { schemaGapClass } from '@alfakit/core'
  import SchemaRenderer from '../schema/SchemaRenderer.svelte'
  import { extraProps } from '../../lib/attributes'
  import { cn } from '../../lib/utils'
  import DeferredSchema from './DeferredSchema.svelte'

  let { component }: { component: FieldsetSchema } = $props()
  const contained = $derived(component.contained !== false)
</script>

<fieldset
  data-contained={contained ? undefined : 'false'}
  {...extraProps(component.extraAttributes, contained ? 'rounded-xl border p-4 pt-3' : 'min-w-0')}
>
  {#if component.label}<legend class={cn('text-sm font-medium', contained ? 'px-1' : 'mb-3')}
      >{component.label}</legend
    >{/if}
  <DeferredSchema {component}>
    {#snippet children(loaded)}
      <SchemaRenderer
        components={loaded.schema ?? []}
        columns={loaded.columns}
        class={schemaGapClass(loaded) || undefined}
      />
    {/snippet}
  </DeferredSchema>
</fieldset>
